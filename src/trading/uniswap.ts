import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import axios from 'axios';
import { Order, OrderSide, OrderType, Balance, Ticker, CreateOrderRequest } from './types';

const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const QUOTER_V2 = '0x61fFE014BA17989E743c5F6cB21bF9697530B21e';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) returns (uint256 amountIn)'
];

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const TOKENS: Record<string, { address: string; decimals: number }> = {
  'WETH': { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  'USDT': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  'USDC': { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  'DAI': { address: '0x6B175474E89094C44Da98b954Eedc6fC8fC3Dcd5', decimals: 18 },
  'WBTC': { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }
};

export class UniswapExchange {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private router: Contract;
  private quoter: Contract;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
    this.router = new Contract(UNISWAP_V3_ROUTER, ROUTER_ABI, this.wallet);
    this.quoter = new Contract(QUOTER_V2, QUOTER_ABI, this.provider);
  }

  async getBalance(tokenAddress?: string): Promise<Balance[]> {
    const balances: Balance[] = [];

    if (!tokenAddress) {
      const ethBalance = await this.provider.getBalance(this.wallet.address);
      balances.push({
        asset: 'ETH',
        free: parseFloat(ethers.formatEther(ethBalance)),
        locked: 0
      });

      for (const [symbol, token] of Object.entries(TOKENS)) {
        const contract = new Contract(token.address, ERC20_ABI, this.provider);
        const balance = await contract.balanceOf(this.wallet.address);
        balances.push({
          asset: symbol,
          free: parseFloat(ethers.formatUnits(balance, token.decimals)),
          locked: 0
        });
      }
    } else {
      const token = Object.entries(TOKENS).find(([, t]) => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (token) {
        const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
        const balance = await contract.balanceOf(this.wallet.address);
        balances.push({
          asset: token[0],
          free: parseFloat(ethers.formatUnits(balance, token[1].decimals)),
          locked: 0
        });
      }
    }

    return balances;
  }

  async getTokenPrice(tokenIn: string, tokenOut: string, amountIn: number): Promise<number> {
    const tokenInInfo = TOKENS[tokenIn.toUpperCase()];
    const tokenOutInfo = TOKENS[tokenOut.toUpperCase()];

    if (!tokenInInfo || !tokenOutInfo) {
      throw new Error('Unsupported token');
    }

    const amountInWei = ethers.parseUnits(amountIn.toString(), tokenInInfo.decimals);

    try {
      const result = await this.quoter.quoteExactInputSingle({
        tokenIn: tokenInInfo.address,
        tokenOut: tokenOutInfo.address,
        amountIn: amountInWei,
        fee: 3000,
        sqrtPriceLimitX96: 0
      });

      return parseFloat(ethers.formatUnits(result.amountOut, tokenOutInfo.decimals));
    } catch (error) {
      console.error('Quoter error:', error);
      return 0;
    }
  }

  async getAllTickers(): Promise<Ticker[]> {
    const tickers: Ticker[] = [];
    const pairs = [
      ['WETH', 'USDC'],
      ['WETH', 'USDT'],
      ['WBTC', 'USDC'],
      ['WBTC', 'WETH'],
      ['DAI', 'USDC'],
      ['USDC', 'USDT']
    ];

    for (const [token0, token1] of pairs) {
      try {
        const price = await this.getTokenPrice(token0, token1, 1);
        tickers.push({
          symbol: `${token0}/${token1}`,
          price,
          change24h: 0,
          volume24h: 0
        });
      } catch (error) {
        console.error(`Error getting price for ${token0}/${token1}:`, error);
      }
    }

    return tickers;
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const [tokenIn, tokenOut] = request.symbol.split('/');
    const tokenInInfo = TOKENS[tokenIn.toUpperCase()];
    const tokenOutInfo = TOKENS[tokenOut.toUpperCase()];

    if (!tokenInInfo || !tokenOutInfo) {
      throw new Error('Unsupported token pair');
    }

    const amountIn = ethers.parseUnits(request.amount.toString(), tokenInInfo.decimals);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    let tx;
    try {
      if (request.side === 'BUY') {
        const amountOutMin = await this.getAmountOutMin(tokenInInfo.address, tokenOutInfo.address, amountIn);
        
        tx = await this.router.exactInputSingle({
          tokenIn: tokenInInfo.address,
          tokenOut: tokenOutInfo.address,
          fee: 3000,
          recipient: this.wallet.address,
          deadline,
          amountIn,
          amountOutMinimum: amountOutMin.mul(95).div(100),
          sqrtPriceLimitX96: 0
        });
      } else {
        const amountOutMin = await this.getAmountOutMin(tokenInInfo.address, tokenOutInfo.address, amountIn);
        
        tx = await this.router.exactInputSingle({
          tokenIn: tokenInInfo.address,
          tokenOut: tokenOutInfo.address,
          fee: 3000,
          recipient: this.wallet.address,
          deadline,
          amountIn,
          amountOutMinimum: amountOutMin.mul(95).div(100),
          sqrtPriceLimitX96: 0
        });
      }

      const receipt = await tx.wait();

      return {
        id: receipt.hash,
        exchange: 'UNISWAP',
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        price: request.price,
        amount: request.amount,
        filledAmount: request.amount,
        status: 'FILLED',
        txHash: receipt.hash,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    } catch (error: any) {
      return {
        id: Date.now().toString(),
        exchange: 'UNISWAP',
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        price: request.price,
        amount: request.amount,
        filledAmount: 0,
        status: 'FAILED',
        error: error.message,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
  }

  private async getAmountOutMin(tokenIn: string, tokenOut: string, amountIn: any): Promise<any> {
    try {
      const result = await this.quoter.quoteExactInputSingle({
        tokenIn,
        tokenOut,
        amountIn,
        fee: 3000,
        sqrtPriceLimitX96: 0
      });
      return result.amountOut;
    } catch {
      return amountIn;
    }
  }

  async getWalletAddress(): Promise<string> {
    return this.wallet.address;
  }
}
