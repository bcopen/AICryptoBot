import { ethers, Contract } from 'ethers';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  holderCount?: number;
  transferCount?: number;
}

export class TokenAnalyzer {
  private provider: ethers.JsonRpcProvider;
  private cache: Map<string, TokenInfo> = new Map();

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async analyzeToken(tokenAddress: string): Promise<TokenInfo | null> {
    const cached = this.cache.get(tokenAddress.toLowerCase());
    if (cached) return cached;

    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => ''),
        contract.symbol().catch(() => ''),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => 0)
      ]);

      if (!name && !symbol) {
        return null;
      }

      const info: TokenInfo = {
        address: tokenAddress.toLowerCase(),
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      };

      this.cache.set(tokenAddress.toLowerCase(), info);
      return info;
    } catch (error) {
      console.error(`Error analyzing token ${tokenAddress}:`, error);
      return null;
    }
  }

  async getTokenHolders(tokenAddress: string, maxHolders: number = 100): Promise<string[]> {
    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
      const holders: string[] = [];
      
      const transferFilter = contract.filters.Transfer() as any;
      const logs = await this.provider.getLogs({
        address: tokenAddress,
        fromBlock: 0,
        topics: transferFilter.topics,
        toBlock: 'latest'
      });

      const addresses = new Set<string>();
      for (const log of logs.slice(-1000)) {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          addresses.add(parsed.args[0].toLowerCase());
          addresses.add(parsed.args[1].toLowerCase());
        }
      }

      addresses.delete('0x0000000000000000000000000000000000000000');
      return Array.from(addresses).slice(0, maxHolders);
    } catch (error) {
      console.error(`Error getting holders for ${tokenAddress}:`, error);
      return [];
    }
  }

  async getTransferCount(tokenAddress: string): Promise<number> {
    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
      const transferFilter = contract.filters.Transfer() as any;
      const logs = await this.provider.getLogs({
        address: tokenAddress,
        fromBlock: 0,
        topics: transferFilter.topics,
        toBlock: 'latest'
      });
      return logs.length;
    } catch (error) {
      console.error(`Error getting transfer count for ${tokenAddress}:`, error);
      return 0;
    }
  }

  async getFullTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    const basicInfo = await this.analyzeToken(tokenAddress);
    if (!basicInfo) return null;

    const [holders, transferCount] = await Promise.all([
      this.getTokenHolders(tokenAddress),
      this.getTransferCount(tokenAddress)
    ]);

    return {
      ...basicInfo,
      holderCount: holders.length,
      transferCount
    };
  }
}
