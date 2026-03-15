import express from 'express';
import cors from 'cors';
import path from 'path';
import { NewContract } from '../types';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const contracts: NewContract[] = [];
let lastUpdate = Date.now();

// Demo data for testing
const demoData: NewContract[] = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    chain: 'ETH',
    blockNumber: 24660300,
    timestamp: Math.floor(Date.now() / 1000) - 300,
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    deployer: '0xdeployer1111111111111111111111111111111'
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
    deployer: '0xdeployer2222222222222222222222222222222'
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌐 Web Server running at http://localhost:${PORT}\n`);
});

export { app };
