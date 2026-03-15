import { Connection, PublicKey } from '@solana/web3.js';
import { NewContract, MonitorConfig } from '../types';

export class SOLMonitor {
  private connection: Connection;
  private currentSlot: number;
  private startSlot: number;
  private knownPrograms: Set<string> = new Set();

  constructor(config: MonitorConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.startSlot = config.startBlock || 0;
    this.currentSlot = this.startSlot;
  }

  async start(onNewContract: (contract: NewContract) => void): Promise<void> {
    console.log('[SOL] Starting monitor...');

    if (this.startSlot === 0) {
      this.currentSlot = await this.connection.getSlot() - 20;
    }

    console.log(`[SOL] Starting from slot: ${this.currentSlot}`);

    this.poll(onNewContract);
  }

  private async poll(onNewContract: (contract: NewContract) => void): Promise<void> {
    try {
      const latestSlot = await this.connection.getSlot();

      if (latestSlot > this.currentSlot) {
        for (let slot = this.currentSlot + 1; slot <= latestSlot; slot++) {
          await this.checkSlot(slot, onNewContract);
        }
        this.currentSlot = latestSlot;
      }
    } catch (error) {
      console.error('[SOL] Error polling:', error);
    }

    setTimeout(() => this.poll(onNewContract), 5000);
  }

  private async checkSlot(slot: number, onNewContract: (contract: NewContract) => void): Promise<void> {
    try {
      const block = await this.connection.getBlock(slot);
      if (!block || !block.transactions) return;

      for (const tx of block.transactions) {
        const txData = tx as any;
        if (!txData.meta) continue;

        for (const log of txData.meta.logMessages || []) {
          if (log.includes('Program log: Initialize') || log.includes('Program log: Create')) {
            const accountKeys = txData.transaction.message.staticAccountKeys;
            const programId = accountKeys?.[0]?.toString();
            if (programId && !this.knownPrograms.has(programId)) {
              this.knownPrograms.add(programId);

              const contract: NewContract = {
                address: programId,
                chain: 'SOL',
                blockNumber: slot,
                timestamp: block.blockTime || Math.floor(Date.now() / 1000),
                txHash: txData.signatures?.[0] || '',
                deployer: accountKeys?.[0]?.toString() || ''
              };

              console.log(`[SOL] New program: ${programId}`);
              onNewContract(contract);
            }
          }
        }
      }
    } catch (error) {
      // Silently handle slots without data
    }
  }
}
