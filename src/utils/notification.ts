import axios from 'axios';
import { NewContract, NotificationConfig } from '../types';

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async notify(contract: NewContract): Promise<void> {
    if (!this.config.enabled) return;

    const message = this.formatMessage(contract);

    if (this.config.telegram?.botToken && this.config.telegram?.chatId) {
      await this.sendTelegram(message);
    }

    if (this.config.webhook?.url) {
      await this.sendWebhook(contract);
    }
  }

  private formatMessage(contract: NewContract): string {
    return `
🔔 New Contract Detected!

Chain: ${contract.chain}
Address: ${contract.address}
Block: ${contract.blockNumber}
Deployer: ${contract.deployer}
TxHash: ${contract.txHash}
Time: ${new Date(contract.timestamp * 1000).toLocaleString()}
    `.trim();
  }

  private async sendTelegram(message: string): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.config.telegram!.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.config.telegram!.chatId,
        text: message,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Telegram notification failed:', error);
    }
  }

  private async sendWebhook(contract: NewContract): Promise<void> {
    try {
      await axios.post(this.config.webhook!.url, contract);
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }
}
