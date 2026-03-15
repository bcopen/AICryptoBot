import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { Order, OrderSide, OrderType, Balance, Ticker, CreateOrderRequest } from './types';

export class BinanceExchange {
  private baseUrl = 'https://api.binance.com';
  private apiKey: string;
  private apiSecret: string;
  private client: AxiosInstance;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  private sign(queryString: string): string {
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
  }

  private async request(method: string, endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now();
    const queryString = new URLSearchParams({
      ...params,
      timestamp: timestamp.toString()
    }).toString();

    const signature = this.sign(queryString);
    const url = `${endpoint}?${queryString}&signature=${signature}`;

    try {
      const response = await this.client.request({
        method,
        url,
        headers: { 'X-MBX-APIKEY': this.apiKey }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || error.message);
    }
  }

  async getBalance(): Promise<Balance[]> {
    const data = await this.request('GET', '/api/v3/account');
    return data.balances.map((b: any) => ({
      asset: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked)
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const data = await this.request('GET', '/api/v3/ticker/24hr', { symbol });
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.volume)
    };
  }

  async getAllTickers(): Promise<Ticker[]> {
    const data = await this.request('GET', '/api/v3/ticker/24hr');
    return data.slice(0, 100).map((t: any) => ({
      symbol: t.symbol,
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      volume24h: parseFloat(t.volume)
    }));
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const params: Record<string, any> = {
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.amount
    };

    if (request.type === 'LIMIT' && request.price) {
      params.price = request.price;
      params.timeInForce = 'GTC';
    }

    const data = await this.request('POST', '/api/v3/order', params);

    return {
      id: data.orderId.toString(),
      exchange: 'BINANCE',
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.origQty),
      filledAmount: parseFloat(data.executedQty),
      status: this.mapStatus(data.status),
      orderId: data.orderId.toString(),
      clientOrderId: data.clientOrderId,
      createdAt: data.time,
      updatedAt: data.updateTime
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<Order> {
    const data = await this.request('DELETE', '/api/v3/order', {
      symbol,
      orderId
    });

    return {
      id: data.orderId.toString(),
      exchange: 'BINANCE',
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.origQty),
      filledAmount: parseFloat(data.executedQty),
      status: 'CANCELLED',
      orderId: data.orderId.toString(),
      createdAt: data.time,
      updatedAt: Date.now()
    };
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    const data = await this.request('GET', '/api/v3/order', {
      symbol,
      orderId
    });

    return {
      id: data.orderId.toString(),
      exchange: 'BINANCE',
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      price: parseFloat(data.price),
      amount: parseFloat(data.origQty),
      filledAmount: parseFloat(data.executedQty),
      status: this.mapStatus(data.status),
      orderId: data.orderId.toString(),
      createdAt: data.time,
      updatedAt: data.updateTime
    };
  }

  async getOpenOrders(): Promise<Order[]> {
    const data = await this.request('GET', '/api/v3/openOrders');
    return data.map((o: any) => ({
      id: o.orderId.toString(),
      exchange: 'BINANCE' as const,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      price: parseFloat(o.price),
      amount: parseFloat(o.origQty),
      filledAmount: parseFloat(o.executedQty),
      status: 'PENDING',
      orderId: o.orderId.toString(),
      createdAt: o.time,
      updatedAt: o.updateTime
    }));
  }

  private mapStatus(status: string): Order['status'] {
    const map: Record<string, Order['status']> = {
      'NEW': 'PENDING',
      'PARTIALLY_FILLED': 'PARTIALLY_FILLED',
      'FILLED': 'FILLED',
      'CANCELED': 'CANCELLED',
      'REJECTED': 'FAILED',
      'EXPIRED': 'FAILED'
    };
    return map[status] || 'PENDING';
  }
}
