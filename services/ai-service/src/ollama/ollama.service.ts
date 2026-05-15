import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaChatResponse {
  message: OllamaChatMessage;
  done: boolean;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly client: AxiosInstance;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const baseURL = config.get<string>('OLLAMA_BASE_URL', 'http://ollama:11434');
    this.model = config.get<string>('OLLAMA_MODEL', 'llama3.2');
    const timeout = config.get<number>('OLLAMA_TIMEOUT_MS', 120000);

    this.client = axios.create({ baseURL, timeout });
  }

  async chat(messages: OllamaChatMessage[]): Promise<string> {
    try {
      const response = await this.client.post<OllamaChatResponse>('/api/chat', {
        model: this.model,
        messages,
        stream: false,
      });
      return response.data.message.content;
    } catch (error) {
      this.logger.error('Ollama chat error', error);
      throw new ServiceUnavailableException(
        'AI service temporarily unavailable. Please ensure Ollama is running.',
      );
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: OllamaChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });
    return this.chat(messages);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/api/tags', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
