import express from 'express';
import cors from 'cors';
import path from 'path';
import { NewContract, ChainType } from '../types';
import { 
  getBalance, 
  getTicker, 
  getAllTickers, 
  createOrder, 
  cancelOrder, 
  getOpenOrders,
  getOrders,
  searchTradingTools,
  executeTradingTool,
  getQVerisClient,
  QVerisTool
} from '../trading';
import { ExchangeType } from '../trading/types';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const contracts: NewContract[] = [];
let lastUpdate = Date.now();

interface MonitoredContract {
  address: string;
  chain: ChainType;
  addedAt: number;
  transactions: NewContract[];
}

const monitoredContracts: Map<string, MonitoredContract> = new Map();

// Demo data for testing
const demoData: NewContract[] = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    chain: 'ETH',
    blockNumber: 24660300,
    timestamp: Math.floor(Date.now() / 1000) - 300,
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    deployer: '0xdeployer1111111111111111111111111111111',
    tokenInfo: {
      name: 'Example Token',
      symbol: 'EXT',
      decimals: 18,
      totalSupply: '1000000000',
      holderCount: 1523,
      transferCount: 8942
    }
  },
  {
    address: 'CrU8xTndy2VoPibSsoMwbn2o2JnKLw3XGr5GLzhV4P5',
    chain: 'SOL',
    blockNumber: 406498000,
    timestamp: Math.floor(Date.now() / 1000) - 600,
    txHash: '5hGx4JF4J8p9K3r2vL9mN4pQ6wX8yZ0A1bC3dE5fG7hJ9kL0mN1oP2qR3sT4uV5w',
    deployer: 'GDEvk7wK2sVYx5x5X7Y9h2Z4m6n8o0p2q4r6s8t0u2v4w6x8y0z2a4b6c8d0e2f4'
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    chain: 'BSC',
    blockNumber: 86669000,
    timestamp: Math.floor(Date.now() / 1000) - 900,
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    deployer: '0xdeployer2222222222222222222222222222222',
    tokenInfo: {
      name: 'BEP20 Token',
      symbol: 'BEP',
      decimals: 18,
      totalSupply: '5000000000',
      holderCount: 3210,
      transferCount: 15678
    }
  }
];

if (process.env.DEMO === 'true') {
  demoData.forEach(c => addContract(c));
}

export function addContract(contract: NewContract): void {
  contracts.unshift(contract);
  lastUpdate = Date.now();
  if (contracts.length > 100) {
    contracts.pop();
  }
}

app.get('/api/contracts', (req, res) => {
  res.json({
    contracts,
    total: contracts.length,
    lastUpdate
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/monitor', (req, res) => {
  const { address, chain } = req.body;
  if (!address || !chain) {
    return res.status(400).json({ error: 'Address and chain are required' });
  }
  
  const key = `${chain}:${address.toLowerCase()}`;
  if (monitoredContracts.has(key)) {
    return res.json({ message: 'Already monitoring', contract: monitoredContracts.get(key) });
  }
  
  const monitored: MonitoredContract = {
    address: address.toLowerCase(),
    chain: chain as ChainType,
    addedAt: Date.now(),
    transactions: []
  };
  
  monitoredContracts.set(key, monitored);
  res.json({ message: 'Now monitoring', contract: monitored });
});

app.get('/api/monitor/:chain/:address', (req, res) => {
  const { chain, address } = req.params;
  const key = `${chain}:${address.toLowerCase()}`;
  const contract = monitoredContracts.get(key);
  
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  
  res.json(contract);
});

app.get('/api/monitor', (req, res) => {
  const list = Array.from(monitoredContracts.values());
  res.json(list);
});

app.delete('/api/monitor/:chain/:address', (req, res) => {
  const { chain, address } = req.params;
  const key = `${chain}:${address.toLowerCase()}`;
  const deleted = monitoredContracts.delete(key);
  
  res.json({ success: deleted });
});

// Trading API endpoints

app.get('/api/trading/balance/:exchange', async (req, res) => {
  try {
    const { exchange } = req.params as { exchange: ExchangeType };
    const balance = await getBalance(exchange);
    res.json(balance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/trading/ticker/:exchange', async (req, res) => {
  try {
    const { exchange } = req.params as { exchange: ExchangeType };
    const { symbol } = req.query;
    
    if (symbol) {
      const ticker = await getTicker(exchange, symbol as string);
      res.json(ticker);
    } else {
      const tickers = await getAllTickers(exchange);
      res.json(tickers);
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/trading/order', async (req, res) => {
  try {
    const { exchange, symbol, side, type, amount, price } = req.body;
    
    if (!exchange || !symbol || !side || !type || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const order = await createOrder({
      exchange,
      symbol,
      side,
      type,
      amount: parseFloat(amount),
      price: price ? parseFloat(price) : undefined
    });
    
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/trading/order/:exchange/:symbol/:orderId', async (req, res) => {
  try {
    const { exchange, symbol, orderId } = req.params as { exchange: ExchangeType; symbol: string; orderId: string };
    const order = await cancelOrder(exchange, symbol, orderId);
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/trading/orders/:exchange', async (req, res) => {
  try {
    const { exchange } = req.params as { exchange: ExchangeType };
    const orders = await getOpenOrders(exchange);
    res.json(orders);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/trading/orders', (req, res) => {
  res.json(getOrders());
});

// QVeris API endpoints
app.get('/api/qveris/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const tools = await searchTradingTools(query as string);
    res.json({ tools });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/qveris/execute', async (req, res) => {
  try {
    const { tool_id, parameters } = req.body;
    
    if (!tool_id || !parameters) {
      return res.status(400).json({ error: 'tool_id and parameters are required' });
    }
    
    const result = await executeTradingTool(tool_id, parameters);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/qveris/tools', (req, res) => {
  const client = getQVerisClient();
  if (!client) {
    return res.status(400).json({ error: 'QVeris not initialized' });
  }
  
  const tools = client.getAvailableTools();
  res.json({ tools });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌐 Web Server running at http://localhost:${PORT}\n`);
});

export { app };
