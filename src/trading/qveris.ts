import axios from 'axios';

export interface QVerisTool {
  tool_id: string;
  name: string;
  description: string;
  params_schema: Record<string, any>;
  examples?: string[];
  weighted_success_rate?: number;
  avg_execution_time?: number;
}

export interface QVerisSearchResult {
  search_id: string;
  tools: QVerisTool[];
}

export interface QVerisExecuteResult {
  success: boolean;
  data?: any;
  error?: string;
  truncated_content?: string;
  full_content_file_url?: string;
}

export class QVerisClient {
  private apiKey: string;
  private baseUrl = 'https://qveris.ai/api/v1';
  private searchId: string = '';
  private availableTools: QVerisTool[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async searchTools(query: string, limit: number = 10): Promise<QVerisSearchResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/search`,
        { query, limit },
        { headers: this.getHeaders(), timeout: 10000 }
      );

      this.searchId = response.data.search_id;
      this.availableTools = response.data.tools;
      
      return response.data;
    } catch (error: any) {
      throw new Error(`QVeris search failed: ${error.message}`);
    }
  }

  async executeTool(toolId: string, parameters: Record<string, any>): Promise<QVerisExecuteResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tools/execute?tool_id=${toolId}`,
        {
          search_id: this.searchId,
          parameters,
          max_response_size: 20480
        },
        { headers: this.getHeaders(), timeout: 15000 }
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchAndExecute(query: string, parameters: Record<string, any>): Promise<QVerisExecuteResult> {
    await this.searchTools(query);
    
    if (this.availableTools.length === 0) {
      return {
        success: false,
        error: 'No tools found'
      };
    }

    const tool = this.availableTools[0];
    return this.executeTool(tool.tool_id, parameters);
  }

  getAvailableTools(): QVerisTool[] {
    return this.availableTools;
  }
}

let qverisClient: QVerisClient | null = null;

export function initQVeris(apiKey: string): void {
  if (apiKey) {
    qverisClient = new QVerisClient(apiKey);
  }
}

export function getQVerisClient(): QVerisClient | null {
  return qverisClient;
}

export async function searchTradingTools(query: string): Promise<QVerisTool[]> {
  if (!qverisClient) {
    throw new Error('QVeris not initialized');
  }
  
  const result = await qverisClient.searchTools(query);
  return result.tools;
}

export async function executeTradingTool(toolId: string, params: Record<string, any>): Promise<QVerisExecuteResult> {
  if (!qverisClient) {
    throw new Error('QVeris not initialized');
  }
  
  return qverisClient.executeTool(toolId, params);
}

export async function findAndExecuteTradingTool(action: string, params: Record<string, any>): Promise<QVerisExecuteResult> {
  if (!qverisClient) {
    throw new Error('QVeris not initialized');
  }
  
  return qverisClient.searchAndExecute(action, params);
}
