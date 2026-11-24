import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { rotasHealth } from '../src/health.js';
import { criarLoggerSilencioso } from './utils.js';

function appHealth(verificacoes, limiteMs) {
  const app = express();
  app.use(rotasHealth({ servico: 'teste', versao: '1.2.3', verificacoes, limiteMs, logger: criarLoggerSilencioso() }));
  return app;
}

describe('rotasHealth', () => {
  it('/health/live responde 200 mesmo com dependências em baixo', async () => {
    const res = await request(appHealth({ redis: () => Promise.reject(new Error('em baixo')) })).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok', servico: 'teste', versao: '1.2.3' });
  });

  it('/health: 200 quando todas as dependências respondem', async () => {
    const res = await request(appHealth({ redis: async () => {}, rabbitmq: async () => {} })).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      estado: 'ok',
      servico: 'teste',
      versao: '1.2.3',
      dependencias: { redis: 'ok', rabbitmq: 'ok' },
    });
  });

  it('/health: 503 quando uma falha (incluindo erros síncronos)', async () => {
    const app = appHealth({
      redis: async () => {},
      rabbitmq: () => {
        throw new Error('sem ligação');
      },
    });
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.estado).toBe('degradado');
    expect(res.body.dependencias).toEqual({ redis: 'ok', rabbitmq: 'falha' });
  });

  it('/health: uma dependência que não responde a tempo conta como falha', async () => {
    const app = appHealth({ lenta: () => new Promise(() => {}) }, 50);
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.dependencias.lenta).toBe('falha');
  });
});
