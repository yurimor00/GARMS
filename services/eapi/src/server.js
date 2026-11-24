// Arranque da EAPI: lê a configuração, liga ao Redis e ao RabbitMQ e abre a porta.
// Se o Redis ou o RabbitMQ ainda não estiverem disponíveis, a EAPI arranca na mesma:
// o /health responde 503 até as ligações estarem feitas (readinessProbe) e os clientes voltam a tentar.
import { readFileSync } from 'node:fs';
import { createClient } from 'redis';
import { criarLogger, criarLigacaoRabbit } from '@garms/common';
import { criarApp, SERVICO } from './app.js';
import { lerConfig } from './config.js';

const { version: versao } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const config = lerConfig();
const logger = criarLogger({ servico: SERVICO, nivel: config.nivelLog });

// Redis: cache partilhada (rate limiting, sub → idUtilizador, catálogo). O cliente volta a ligar sozinho.
// Nova tentativa com espera crescente (100 ms, 200 ms, … até 5 s).
const redis = createClient({
  url: config.redisUrl,
  socket: { reconnectStrategy: (tentativas) => Math.min(100 * 2 ** tentativas, 5000) },
});
// Um aviso por falha; as tentativas seguintes só em debug (senão uma falha longa enche os logs)
let redisEmFalha = false;
redis.on('error', (erro) => {
  logger[redisEmFalha ? 'debug' : 'warn']({ erro: erro.message }, 'erro na ligação ao Redis');
  redisEmFalha = true;
});
redis.on('ready', () => {
  redisEmFalha = false;
  logger.info('ligado ao Redis');
});
redis.connect().catch(() => {}); // as falhas já são registadas no evento "error"

// RabbitMQ: a EAPI vai consumir recommendation.ready e weather.alert (WebSocket)
const rabbit = criarLigacaoRabbit({ url: config.rabbitmqUrl, logger, nomeLigacao: SERVICO });

const app = criarApp({
  logger,
  versao,
  trustProxy: config.trustProxy,
  verificacoes: {
    redis: async () => {
      if (!redis.isReady) throw new Error('sem ligação ao Redis');
      await redis.ping();
    },
    rabbitmq: () => rabbit.verificar(),
  },
});

const servidor = app.listen(config.porta, () => {
  logger.info({ porta: config.porta, versao }, 'EAPI a escutar');
});

// Encerramento limpo (SIGTERM do Kubernetes/Docker): deixa de aceitar pedidos, acaba os que estão
// a meio e fecha as ligações. Se demorar mais de 10 s, sai à força.
let aEncerrar = false;
async function encerrar(sinal) {
  if (aEncerrar) return;
  aEncerrar = true;
  logger.info({ sinal }, 'a encerrar');
  setTimeout(() => process.exit(1), 10000).unref();

  servidor.close();
  await Promise.allSettled([redis.isOpen ? redis.quit() : Promise.resolve(), rabbit.fechar()]);
  logger.info('encerrada');
  process.exit(0);
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);

process.on('unhandledRejection', (erro) => logger.error({ err: erro }, 'promessa rejeitada sem tratamento'));
