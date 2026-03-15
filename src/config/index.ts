import { MonitorOptions, NotificationConfig } from '../types';

export const config: MonitorOptions = {
  chains: ['ETH', 'SOL', 'BSC'],
  pollInterval: 5000,
  notification: {
    enabled: true,
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || ''
    },
    webhook: {
      url: process.env.WEBHOOK_URL || ''
    }
  }
};

export const chainConfigs = {
  ETH: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    chainId: 1,
    startBlock: parseInt(process.env.ETH_START_BLOCK || '0', 10) || undefined
  },
  SOL: {
    rpcUrl: process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com',
    startBlock: parseInt(process.env.SOL_START_BLOCK || '0', 10) || undefined
  },
  BSC: {
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    chainId: 56,
    startBlock: parseInt(process.env.BSC_START_BLOCK || '0', 10) || undefined
  }
};
