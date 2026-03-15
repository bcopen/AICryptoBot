export type ExchangeType = 'BINANCE' | 'OKX' | 'UNISWAP';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'FAILED';

export interface Order {
  id: string;
  exchange: ExchangeType;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  amount: number;
  filledAmount: number;
  status: OrderStatus;
  txHash?: string;
  orderId?: string;
  clientOrderId?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface TradingConfig {
  exchange: ExchangeType;
  apiKey?: string;
  apiSecret?: string;
  privateKey?: string;
  rpcUrl?: string;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
}

export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface CreateOrderRequest {
  exchange: ExchangeType;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
}
