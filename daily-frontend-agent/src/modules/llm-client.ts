import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import type { AgentConfig } from '../types/index.js';
import { logger, sanitizeForReport, generateRunId } from '../utils/index.js';

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class LLMClient {
  private config: AgentConfig;
  private client: Anthropic;
  private promptLogDir: string;

  constructor(config: AgentConfig) {
    this.config = config;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.client = new Anthropic({ apiKey });
    this.promptLogDir = path.join(config.reporting.stateDir, 'prompt-logs');
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const { model, maxTokens, temperature, promptLogging } = this.config.llm;

    logger.debug(`Calling LLM with model: ${model}`);

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
      });

      const textContent = response.content.find((c) => c.type === 'text');
      const content = textContent?.type === 'text' ? textContent.text : '';

      const result: LLMResponse = {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      if (promptLogging) {
        this.logPrompt(prompt, systemPrompt, result);
      }

      logger.debug(
        `LLM response received. Tokens: ${result.usage.inputTokens} in, ${result.usage.outputTokens} out`
      );

      return result;
    } catch (error) {
      logger.error('LLM request failed', error);
      throw error;
    }
  }

  async completeWithJSON<T>(
    prompt: string,
    systemPrompt?: string
  ): Promise<{ data: T; raw: LLMResponse }> {
    const jsonSystemPrompt = `${systemPrompt || ''}

IMPORTANT: Your response must be valid JSON only. Do not include any text before or after the JSON. Do not use markdown code blocks. Output only the raw JSON object.`;

    const response = await this.complete(prompt, jsonSystemPrompt);

    try {
      // Try to extract JSON from the response
      let jsonStr = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const data = JSON.parse(jsonStr) as T;
      return { data, raw: response };
    } catch (error) {
      logger.error('Failed to parse LLM JSON response:', response.content);
      throw new Error(`Invalid JSON response from LLM: ${error}`);
    }
  }

  private logPrompt(
    prompt: string,
    systemPrompt: string | undefined,
    response: LLMResponse
  ): void {
    try {
      if (!fs.existsSync(this.promptLogDir)) {
        fs.mkdirSync(this.promptLogDir, { recursive: true });
      }

      const logFile = path.join(
        this.promptLogDir,
        `${generateRunId()}.json`
      );

      const logEntry = {
        timestamp: new Date().toISOString(),
        model: this.config.llm.model,
        temperature: this.config.llm.temperature,
        systemPrompt: sanitizeForReport(systemPrompt || ''),
        prompt: sanitizeForReport(prompt),
        response: sanitizeForReport(response.content),
        usage: response.usage,
      };

      fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
    } catch (error) {
      logger.warn('Failed to log prompt', error);
    }
  }
}
