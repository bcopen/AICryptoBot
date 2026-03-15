export type ChainType = 'ETH' | 'SOL' | 'BSC';

export interface NewContract {
  address: string;
  chain: ChainType;
  blockNumber: number;
  timestamp: number;
  txHash: string;
  deployer: string;
}

export interface MonitorConfig {
  chain: ChainType;
  rpcUrl: string;
  chainId?: number;
  startBlock?: number;
}

export interface NotificationConfig {
  enabled: boolean;
  telegram?: {
    botToken: string;
    chatId: string;
  };
  webhook?: {
    url: string;
  };
}

export interface MonitorOptions {
  chains: ChainType[];
  notification: NotificationConfig;
  pollInterval: number;
  filters?: {
    minValue?: number;
    contractTypes?: string[];
  };
}
