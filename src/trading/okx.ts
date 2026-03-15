import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { Order, OrderSide, OrderType, Balance, Ticker, CreateOrderRequest } from './types';

export class OKXExchange {
  private baseUrl = 'https://www.okx.com';
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private client: AxiosInstance;

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  private sign(timestamp: string, method: string, path: string, body: string = ''): string {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.apiSecret).update(message).digest('base64');
  }

  private async request(method: string, endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = new Date().toISOString();
    const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const path = endpoint + queryString;
    const body = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
    
    const signature = this.sign(timestamp, method, path, body);

    try {
      const response = await this.client.request({
        method,
        url: this.baseUrl + path,
        data: Object.keys(params).length > 0 ? params : undefined,
        headers: {
          'OK-ACCESS-KEY': this.apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.passphrase,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.code !== '0') {
        throw new Error(response.data.msg || 'Unknown error');
      }

      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || error.message);
    }
  }

  async getBalance(): Promise<Balance[]> {
    const data = await this.request('GET', '/api/v5/account/balance');
    return data[0].details.map((b: any) => ({
      asset: b.ccy,
      free: parseFloat(b.availBal),
      locked: parseFloat(b.frozenBal)
    }));
  }

  async getTicker(instId: string): Promise<Ticker> {
    const data = await this.request('GET', '/api/v5/market/ticker', { instId });
    const t = data[0];
    return {
      symbol: t.instId,
      price: parseFloat(t.last),
      change24h: parseFloat(t.sodUtc0),
      volume24h: parseFloat(t.vol24h)
    };
  }

  async getAllTickers(instType: string = 'SPOT'): Promise<Ticker[]> {
    const data = await this.request('GET', '/api/v5/market/tickers', { instType });
    return data.map((t: any) => ({
      symbol: t.instId,
      price: parseFloat(t.last),
      change24h: parseFloat(t.sodUtc0),
      volume24h: parseFloat(t.vol24h)
    }));
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const params: Record<string, string> = {
      instId: request.symbol,
      tdMode: 'cash',
      side: request.side.toLowerCase(),
      ordType: request.type.toLowerCase(),
      sz: request.amount.toString()
    };

    if (request.type === 'LIMIT' && request.price) {
      params.px = request.price.toString();
    }

    const data = await this.request('POST', '/api/v5/trade/order', params);
    const o = data[0];

    return {
      id: o.ordId,
      exchange: 'OKX',
      symbol: o.instId,
      side: request.side,
      type: request.type,
      price: request.price,
      amount: parseFloat(o.sz),
      filledAmount: parseFloat(o.accFillSz),
      status: this.mapStatus(o.state),
      orderId: o.ordId,
      clientOrderId: o.clOrdId,
      createdAt: parseInt(o.cTime),
      updatedAt: parseInt(o.uTime)
    };
  }

  async cancelOrder(instId: string, ordId: string): Promise<Order> {
    const data = await this.request('POST', '/api/v5/trade/cancel-order', {
      instId,
      ordId
    });
    const o = data[0];

    return {
      id: o.ordId,
      exchange: 'OKX',
      symbol: o.instId,
      side: o.side as OrderSide,
      type: o.ordType as OrderType,
      amount: parseFloat(o.sz),
      filledAmount: parseFloat(o.accFillSz),
      status: 'CANCELLED',
      orderId: o.ordId,
      createdAt: parseInt(o.cTime),
      updatedAt: Date.now()
    };
  }

  async getOrder(instId: string, ordId: string): Promise<Order> {
    const data = await this.request('GET', '/api/v5/trade/order', {
      instId,
      ordId
    });
    const o = data[0];

    return {
      id: o.ordId,
      exchange: 'OKX',
      symbol: o.instId,
      side: o.side as OrderSide,
      type: o.ordType as OrderType,
      price: parseFloat(o.px),
      amount: parseFloat(o.sz),
      filledAmount: parseFloat(o.accFillSz),
      status: this.mapStatus(o.state),
      orderId: o.ordId,
      createdAt: parseInt(o.cTime),
      updatedAt: parseInt(o.uTime)
    };
  }

  async getOpenOrders(): Promise<Order[]> {
    const data = await this.request('GET', '/api/v5/trade/orders-pending');
    return data.map((o: any) => ({
      id: o.ordId,
      exchange: 'OKX' as const,
      symbol: o.instId,
      side: o.side as OrderSide,
      type: o.ordType as OrderType,
      price: parseFloat(o.px),
      amount: parseFloat(o.sz),
      filledAmount: parseFloat(o.accFillSz),
      status: 'PENDING',
      orderId: o.ordId,
      createdAt: parseInt(o.cTime),
      updatedAt: parseInt(o.uTime)
    }));
  }

  private mapStatus(state: string): Order['status'] {
    const map: Record<string, Order['status']> = {
      'live': 'PENDING',
      'partially_filled': 'PARTIALLY_FILLED',
      'filled': 'FILLED',
      'canceled': 'CANCELLED',
      'failed': 'FAILED'
    };
    return map[state] || 'PENDING';
  }
}
