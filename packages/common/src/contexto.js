// Contexto de cada pedido (correlationId), disponível em qualquer ponto do código
// sem o passar de função em função: logs, chamadas a outros serviços e eventos.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export const CABECALHO_CORRELATION_ID = 'x-correlation-id';

// Aceita só IDs "simples" vindos de fora (evita injetar lixo ou texto enorme nos logs)
const FORMATO_VALIDO = /^[A-Za-z0-9._:-]{1,100}$/;

const armazenamento = new AsyncLocalStorage();

/** correlationId do pedido em curso, ou undefined fora de um pedido. */
export function obterCorrelationId() {
  return armazenamento.getStore()?.correlationId;
}

/** Corre `fn` com um correlationId (ex.: ao processar um evento do RabbitMQ). */
export function comCorrelationId(correlationId, fn) {
  return armazenamento.run({ correlationId: correlationId || randomUUID() }, fn);
}

/** Middleware Express: reutiliza o X-Correlation-Id recebido ou cria um novo e devolve-o na resposta. */
export function correlationIdMiddleware() {
  return (req, res, next) => {
    const recebido = req.get(CABECALHO_CORRELATION_ID);
    const correlationId = recebido && FORMATO_VALIDO.test(recebido) ? recebido : randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    armazenamento.run({ correlationId }, next);
  };
}
