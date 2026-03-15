import { config, chainConfigs } from './config';
import { ETHMonitor } from './monitors/eth';
import { SOLMonitor } from './monitors/sol';
import { BSCMonitor } from './monitors/bsc';
import { NotificationService } from './utils/notification';
import { addContract } from './web/server';
import { ChainType, NewContract } from './types';

class ContractMonitor {
  private monitors: Map<ChainType, any> = new Map();
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService(config.notification);
  }

  async start(): Promise<void> {
    console.log('=== Multi-Chain Contract Monitor Started ===');
    console.log(`Chains: ${config.chains.join(', ')}`);
    console.log(`Poll Interval: ${config.pollInterval}ms`);
    console.log('');

    const onNewContract = async (contract: NewContract) => {
      console.log(`\n🎉 New Contract Found!`);
      console.log(`   Chain: ${contract.chain}`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Block: ${contract.blockNumber}`);
      console.log(`   Deployer: ${contract.deployer}\n`);

      addContract(contract);
      await this.notificationService.notify(contract);
    };

    for (const chain of config.chains) {
      this.startChainMonitor(chain, onNewContract);
    }
  }

  private startChainMonitor(chain: ChainType, onNewContract: (contract: NewContract) => void): void {
    const chainConfig = chainConfigs[chain];

    switch (chain) {
      case 'ETH':
        const ethMonitor = new ETHMonitor({ chain, ...chainConfig });
        this.monitors.set(chain, ethMonitor);
        ethMonitor.start(onNewContract);
        break;
      case 'SOL':
        const solMonitor = new SOLMonitor({ chain, ...chainConfig });
        this.monitors.set(chain, solMonitor);
        solMonitor.start(onNewContract);
        break;
      case 'BSC':
        const bscMonitor = new BSCMonitor({ chain, ...chainConfig });
        this.monitors.set(chain, bscMonitor);
        bscMonitor.start(onNewContract);
        break;
    }
  }
}

const monitor = new ContractMonitor();
monitor.start().catch(console.error);
