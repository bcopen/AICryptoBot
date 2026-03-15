# Multi-Chain New Contract Monitor

实时监控 ETH、Solana、BSC 链上的新合约部署。

## 功能特性

- **多链支持**: ETH、以太坊、Solana、BSC 币安智能链
- **实时监控**: 轮询检测新创建的合约地址
- **Web 界面**: 可视化展示监控数据
- **通知支持**: Telegram、Webhook 通知

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置

复制 `.env.example` 为 `.env`，配置以下内容：

```env
# RPC 节点 (可选，使用公共节点)
ETH_RPC_URL=
SOL_RPC_URL=
BSC_RPC_URL=

# Telegram 通知
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Webhook 通知
WEBHOOK_URL=
```

### 运行

```bash
# 开发模式
npm run dev

# 构建并运行
npm run build
npm start
```

### 访问

- Web 界面: http://localhost:3000
- API: http://localhost:3000/api/contracts

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/contracts` | GET | 获取合约列表 |
| `/api/health` | GET | 健康检查 |

## 响应示例

```json
{
  "contracts": [
    {
      "address": "0x123...",
      "chain": "ETH",
      "blockNumber": 24660300,
      "timestamp": 1700000000,
      "txHash": "0xabc...",
      "deployer": "0xdef..."
    }
  ],
  "total": 1,
  "lastUpdate": 1700000000000
}
```

## 技术栈

- Node.js + TypeScript
- ethers.js (ETH/BSC)
- @solana/web3.js (Solana)
- Express + HTML/CSS/JS

## License

MIT
