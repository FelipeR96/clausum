import { getDeepSeekApiKey, getEnv } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import { SYSTEM_BASE } from './prompts';
import { redactar, restaurar } from '../../privacidad/redaccion';

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
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

export async function callDeepSeek(
  userPrompt: string,
  context: { userId: string; operation: string; systemPrompt?: string }
): Promise<DeepSeekResult> {
  const env = getEnv();
  const apiKey = getDeepSeekApiKey();

  // Los datos personales se sustituyen por marcadores ANTES de construir
  // el mensaje. Va aqui y no en cada servicio a proposito: este es el unico
  // punto por el que el texto sale del pais, asi que nadie puede añadir una
  // quinta ruta de analisis que se salte la proteccion sin darse cuenta.
  //
  // Si redactar() fallara, la llamada falla con ella. Es deliberado: un
  // try/catch que siguiera adelante con el texto original convertiria un
  // error en una fuga silenciosa, que es mucho peor que un analisis caido.
  const { texto: promptRedactado, mapa, conteo } = redactar(userPrompt);

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: context.systemPrompt ?? SYSTEM_BASE },
    { role: 'user', content: promptRedactado },
  ];

  // Solo el recuento por tipo, aplanado a texto: metadata no admite
  // objetos anidados. Los valores ocultados no se registran NUNCA; un log
  // con el nombre y la cedula dentro anularia el sentido de todo esto.
  const resumenOcultados = Object.entries(conteo)
    .map(([tipo, n]) => `${tipo}=${n}`)
    .join(' ');

  if (resumenOcultados) {
    logger.info('deepseek', 'Datos personales ocultados antes de enviar', {
      userId: context.userId,
      metadata: { operation: context.operation, ocultados: resumenOcultados },
    });
  }

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

      // Si el modelo agota su presupuesto de salida, el JSON llega cortado
      // a la mitad y el fallo aparece despues, al parsear, con una cara que
      // no es la suya. Decirlo aqui ahorra la investigacion entera.
      if (data.choices?.[0]?.finish_reason === 'length') {
        throw new AppError(
          'DeepSeek corto la respuesta por longitud',
          502,
          'DEEPSEEK_TRUNCATED'
        );
      }

      return {
        // La respuesta llega como documento JSON y los marcadores viven
        // dentro de sus cadenas: hay que reinsertar escapando, o un nombre
        // con comillas rompe el JSON y tumba el analisis.
        content: restaurar(content, mapa, { enJson: true }),
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
