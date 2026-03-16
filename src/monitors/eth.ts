import { ethers, Contract } from 'ethers';
import { NewContract, MonitorConfig } from '../types';
import { TokenAnalyzer } from './token-analyzer';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)'
];

export class ETHMonitor {
  private provider: ethers.JsonRpcProvider;
  private tokenAnalyzer: TokenAnalyzer;
  private currentBlock: number;
  private startBlock: number;
  private knownContracts: Set<string> = new Set();
  private analyzedContracts: Set<string> = new Set();

  constructor(config: MonitorConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.tokenAnalyzer = new TokenAnalyzer(config.rpcUrl);
    this.startBlock = config.startBlock || 0;
    this.currentBlock = this.startBlock;
  }

  async start(onNewContract: (contract: NewContract) => void): Promise<void> {
    console.log('[ETH] Starting monitor...');

    if (this.startBlock === 0) {
      this.currentBlock = await this.provider.getBlockNumber() - 10;
    }

    console.log(`[ETH] Starting from block: ${this.currentBlock}`);

    this.poll(onNewContract);
  }

  private async poll(onNewContract: (contract: NewContract) => void): Promise<void> {
    try {
      const latestBlock = await this.provider.getBlockNumber();

      if (latestBlock > this.currentBlock) {
        for (let blockNum = this.currentBlock + 1; blockNum <= latestBlock; blockNum++) {
          await this.checkBlock(blockNum, onNewContract);
        }
        this.currentBlock = latestBlock;
      }
    } catch (error) {
      console.error('[ETH] Error polling:', error);
    }

    setTimeout(() => this.poll(onNewContract), 5000);
  }

  private async checkBlock(blockNum: number, onNewContract: (contract: NewContract) => void): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNum, true);
      if (!block || !block.transactions) return;

      for (const tx of block.transactions) {
        const txObj = tx as any;
        if (txObj.to === null && txObj.creates) {
          const contractAddress = txObj.creates.toLowerCase();

          if (this.knownContracts.has(contractAddress)) continue;
          this.knownContracts.add(contractAddress);

          const contract: NewContract = {
            address: contractAddress,
            chain: 'ETH',
            blockNumber: blockNum,
            timestamp: Number(block.timestamp),
            txHash: txObj.hash,
            deployer: txObj.from
          };

          if (!this.analyzedContracts.has(contractAddress)) {
            this.analyzedContracts.add(contractAddress);
            const tokenInfo = await this.analyzeToken(contractAddress);
            if (tokenInfo) {
              contract.tokenInfo = tokenInfo;
            }
          }

          console.log(`[ETH] New contract: ${contractAddress}${contract.tokenInfo ? ` (${contract.tokenInfo.symbol})` : ''}`);
          onNewContract(contract);
        }
      }
    } catch (error) {
      console.error(`[ETH] Error checking block ${blockNum}:`, error);
    }
  }

  private async analyzeToken(address: string): Promise<NewContract['tokenInfo'] | null> {
    try {
      const contract = new Contract(address, ERC20_ABI, this.provider);
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => null),
        contract.symbol().catch(() => null),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => null)
      ]);

      if (!name || !symbol) return null;

      return {
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        holderCount: 1,
        transferCount: 0
      };
    } catch {
      return null;
    }
  }
}
