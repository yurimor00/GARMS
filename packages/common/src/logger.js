// Logs estruturados em JSON (pino), iguais em todos os serviços.
// Cada linha leva: level (error/warn/info/debug), time (ISO, UTC), servico, correlationId e msg.
// Nunca escrever tokens, passwords ou dados pessoais: os caminhos abaixo são sempre ocultados.
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { obterCorrelationId } from './contexto.js';

// Campos sensíveis: no topo da linha (ex.: logger.info({ email })) e um nível abaixo (ex.: { utilizador: { email } }).
// O pino não tem "qualquer profundidade": dados pessoais não se põem nos logs, isto é só uma rede de segurança.
const SENSIVEIS = ['password', 'token', 'accessToken', 'email', 'authorization'];

export const CAMPOS_OCULTOS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-internal-api-key"]',
  'res.headers["set-cookie"]',
  ...SENSIVEIS,
  ...SENSIVEIS.map((campo) => `*.${campo}`),
];

/**
 * Cria o logger do serviço.
 * @param {{ servico: string, nivel?: string, destino?: import('pino').DestinationStream }} opcoes
 */
export function criarLogger({ servico, nivel = 'info', destino } = {}) {
  return pino(
    {
      level: nivel,
      base: { servico },
      timestamp: pino.stdTimeFunctions.isoTime,
      // "level": "info" em texto, em vez do número do pino (mais fácil de pesquisar)
      formatters: { level: (label) => ({ level: label }) },
      mixin() {
        const correlationId = obterCorrelationId();
        return correlationId ? { correlationId } : {};
      },
      redact: { paths: CAMPOS_OCULTOS, censor: '[oculto]' },
    },
    destino,
  );
}

/**
 * Middleware que regista uma linha por pedido HTTP (método, caminho, estado e duração).
 * 5xx → error, 4xx → warn, resto → info; os health checks só em debug (as probes do Kubernetes são frequentes).
 */
export function registoPedidos(logger) {
  return pinoHttp({
    logger,
    genReqId: (req) => req.correlationId,
    customLogLevel(req, res, erro) {
      if (erro || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      if (req.url.startsWith('/health')) return 'debug';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode}`,
    // Só o essencial: sem cabeçalhos nem query string (podem ter dados pessoais, ex.: cidade)
    serializers: {
      req: (req) => ({ method: req.method, path: req.url.split('?')[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customAttributeKeys: { responseTime: 'duracaoMs' },
  });
}
