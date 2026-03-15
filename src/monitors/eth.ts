import { ethers, Contract, Interface } from 'ethers';
import { NewContract, MonitorConfig } from '../types';

export class ETHMonitor {
  private provider: ethers.JsonRpcProvider;
  private currentBlock: number;
  private startBlock: number;
  private knownContracts: Set<string> = new Set();

  constructor(config: MonitorConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
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

          console.log(`[ETH] New contract: ${contractAddress}`);
          onNewContract(contract);
        }
      }
    } catch (error) {
      console.error(`[ETH] Error checking block ${blockNum}:`, error);
    }
  }
}
