import { getDeepSeekApiKey, getEnv } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import { SYSTEM_BASE } from './prompts';

export interface DeepSeekMessage {
  role: 'system' | 'user';
  content: string;
}

export interface DeepSeekResult {
  content: string;
  tokensUsed: number;
  model: string;
}

interface DeepSeekApiResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

export async function callDeepSeek(
  userPrompt: string,
  context: { userId: string; operation: string; systemPrompt?: string }
): Promise<DeepSeekResult> {
  const env = getEnv();
  const apiKey = getDeepSeekApiKey();

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: context.systemPrompt ?? SYSTEM_BASE },
    { role: 'user', content: userPrompt },
  ];

  const call = async (): Promise<DeepSeekResult> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.DEEPSEEK_TIMEOUT_MS);

    try {
      const response = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.DEEPSEEK_MODEL,
          messages,
          temperature: 0.1,
          // V4 activa thinking por defecto; desactivar = comportamiento tipo deepseek-chat
          thinking: { type: 'disabled' },
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as DeepSeekApiResponse;

      if (!response.ok) {
        const msg = data.error?.message ?? `DeepSeek HTTP ${response.status}`;
        logger.warn('deepseek', msg, {
          userId: context.userId,
          metadata: { operation: context.operation, status: response.status },
        });
        throw new AppError(msg, response.status === 429 ? 429 : 502, 'DEEPSEEK_ERROR');
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new AppError('Respuesta vacía de DeepSeek', 502, 'DEEPSEEK_EMPTY');
      }

      return {
        content,
        tokensUsed: data.usage?.total_tokens ?? 0,
        model: env.DEEPSEEK_MODEL,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError('Tiempo de espera agotado al llamar a DeepSeek', 504, 'DEEPSEEK_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return withRetry(call, { maxAttempts: env.DEEPSEEK_MAX_RETRIES });
}
