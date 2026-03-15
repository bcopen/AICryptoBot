import { MonitorOptions, NotificationConfig } from '../types';
import { initExchange } from '../trading';

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

export const tradingConfig = {
  BINANCE: {
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_API_SECRET || ''
  },
  OKX: {
    apiKey: process.env.OKX_API_KEY || '',
    apiSecret: process.env.OKX_API_SECRET || '',
    passphrase: process.env.OKX_PASSPHRASE || ''
  },
  UNISWAP: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    privateKey: process.env.UNISWAP_PRIVATE_KEY || ''
  }
};

export function initTrading(): void {
  if (tradingConfig.BINANCE.apiKey && tradingConfig.BINANCE.apiSecret) {
    initExchange({ type: 'BINANCE', ...tradingConfig.BINANCE });
  }
  if (tradingConfig.OKX.apiKey && tradingConfig.OKX.apiSecret && tradingConfig.OKX.passphrase) {
    initExchange({ type: 'OKX', ...tradingConfig.OKX });
  }
  if (tradingConfig.UNISWAP.privateKey && tradingConfig.UNISWAP.rpcUrl) {
    initExchange({ type: 'UNISWAP', ...tradingConfig.UNISWAP });
  }
}

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
