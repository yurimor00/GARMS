// Monta a aplicação Express da EAPI. Não liga a nada nem abre portas: recebe as dependências,
// para os testes poderem criar a app com verificações falsas.
import express from 'express';
import {
  correlationIdMiddleware,
  registoPedidos,
  rotasHealth,
  rotaInexistente,
  tratarErros,
} from '@garms/common';

export const SERVICO = 'eapi';

/**
 * @param {{
 *   logger: import('pino').Logger,
 *   versao?: string,
 *   verificacoes?: Record<string, () => Promise<unknown>>,
 *   trustProxy?: number | false,
 * }} opcoes
 */
export function criarApp({ logger, versao, verificacoes = {}, trustProxy = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);

  // Ordem importa: primeiro o correlationId, para estar em todas as linhas de log
  app.use(correlationIdMiddleware());
  app.use(registoPedidos(logger));
  app.use(express.json({ limit: '1mb' }));

  app.use(rotasHealth({ servico: SERVICO, versao, verificacoes, logger }));

  // API pública (contracts/openapi.yaml). As rotas entram aqui, por episódio:
  // validação do token do Auth0 e rate limiting primeiro, depois /me, /pieces, /outfits, /today, ...
  const api = express.Router();
  app.use('/api/v1', api);

  app.use(rotaInexistente());
  app.use(tratarErros(logger));
  return app;
}
