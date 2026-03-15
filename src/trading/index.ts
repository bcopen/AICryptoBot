import { BinanceExchange } from './binance';
import { OKXExchange } from './okx';
import { UniswapExchange } from './uniswap';
import { QVerisClient, searchTradingTools, executeTradingTool, initQVeris, getQVerisClient, QVerisTool } from './qveris';
import { Order, ExchangeType, Balance, Ticker, CreateOrderRequest } from './types';

const orders: Map<string, Order> = new Map();

let binance: BinanceExchange | null = null;
let okx: OKXExchange | null = null;
let uniswap: UniswapExchange | null = null;

export function initExchange(config: {
  type: ExchangeType;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  privateKey?: string;
  rpcUrl?: string;
}): void {
  switch (config.type) {
    case 'BINANCE':
      if (config.apiKey && config.apiSecret) {
        binance = new BinanceExchange(config.apiKey, config.apiSecret);
      }
      break;
    case 'OKX':
      if (config.apiKey && config.apiSecret && config.passphrase) {
        okx = new OKXExchange(config.apiKey, config.apiSecret, config.passphrase);
      }
      break;
    case 'UNISWAP':
      if (config.privateKey && config.rpcUrl) {
        uniswap = new UniswapExchange(config.rpcUrl, config.privateKey);
      }
      break;
  }
}

export async function getBalance(exchange: ExchangeType): Promise<Balance[]> {
  switch (exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      return binance.getBalance();
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      return okx.getBalance();
    case 'UNISWAP':
      if (!uniswap) throw new Error('Uniswap not configured');
      return uniswap.getBalance();
    default:
      throw new Error('Unsupported exchange');
  }
}

export async function getTicker(exchange: ExchangeType, symbol: string): Promise<Ticker> {
  switch (exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      return binance.getTicker(symbol);
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      return okx.getTicker(symbol);
    case 'UNISWAP':
      throw new Error('Uniswap does not support single ticker');
    default:
      throw new Error('Unsupported exchange');
  }
}

export async function getAllTickers(exchange: ExchangeType): Promise<Ticker[]> {
  switch (exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      return binance.getAllTickers();
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      return okx.getAllTickers();
    case 'UNISWAP':
      if (!uniswap) throw new Error('Uniswap not configured');
      return uniswap.getAllTickers();
    default:
      throw new Error('Unsupported exchange');
  }
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  let order: Order;

  switch (request.exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      order = await binance.createOrder(request);
      break;
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      order = await okx.createOrder(request);
      break;
    case 'UNISWAP':
      if (!uniswap) throw new Error('Uniswap not configured');
      order = await uniswap.createOrder(request);
      break;
    default:
      throw new Error('Unsupported exchange');
  }

  orders.set(order.id, order);
  return order;
}

export async function cancelOrder(exchange: ExchangeType, symbol: string, orderId: string): Promise<Order> {
  let order: Order;

  switch (exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      order = await binance.cancelOrder(symbol, orderId);
      break;
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      order = await okx.cancelOrder(symbol, orderId);
      break;
    case 'UNISWAP':
      throw new Error('Cannot cancel Uniswap orders');
    default:
      throw new Error('Unsupported exchange');
  }

  orders.set(order.id, order);
  return order;
}

export async function getOrder(exchange: ExchangeType, symbol: string, orderId: string): Promise<Order> {
  const cached = orders.get(orderId);
  if (cached && cached.exchange === exchange) {
    return cached;
  }

  switch (exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      return binance.getOrder(symbol, orderId);
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      return okx.getOrder(symbol, orderId);
    default:
      throw new Error('Unsupported exchange');
  }
}

export async function getOpenOrders(exchange: ExchangeType): Promise<Order[]> {
  switch (exchange) {
    case 'BINANCE':
      if (!binance) throw new Error('Binance not configured');
      return binance.getOpenOrders();
    case 'OKX':
      if (!okx) throw new Error('OKX not configured');
      return okx.getOpenOrders();
    case 'UNISWAP':
      return [];
    default:
      throw new Error('Unsupported exchange');
  }
}

export function getOrders(): Order[] {
  return Array.from(orders.values());
}

export { QVerisClient, QVerisTool };
export { initQVeris, searchTradingTools, executeTradingTool, getQVerisClient };
