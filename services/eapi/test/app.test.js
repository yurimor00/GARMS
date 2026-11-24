import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { criarLogger } from '@garms/common';
import { criarApp } from '../src/app.js';
import { lerConfig } from '../src/config.js';

const logger = criarLogger({ servico: 'eapi', nivel: 'silent' });

describe('EAPI: app', () => {
  it('/health mostra o estado do Redis e do RabbitMQ', async () => {
    const app = criarApp({
      logger,
      versao: '0.1.0',
      verificacoes: { redis: async () => {}, rabbitmq: () => Promise.reject(new Error('em baixo')) },
    });
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ servico: 'eapi', dependencias: { redis: 'ok', rabbitmq: 'falha' } });
  });

  it('rota desconhecida em /api/v1 responde 404 no formato Erro, com X-Correlation-Id', async () => {
    const res = await request(criarApp({ logger })).get('/api/v1/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' });
    expect(res.headers['x-correlation-id']).toBeTruthy();
  });

  it('não revela a tecnologia (sem X-Powered-By)', async () => {
    const res = await request(criarApp({ logger })).get('/health/live');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('EAPI: config', () => {
  const base = { REDIS_URL: 'redis://localhost:6379', RABBITMQ_URL: 'amqp://localhost' };

  it('valores por omissão', () => {
    expect(lerConfig(base)).toEqual({
      porta: 3000,
      nivelLog: 'info',
      redisUrl: base.REDIS_URL,
      rabbitmqUrl: base.RABBITMQ_URL,
      trustProxy: false,
    });
  });

  it('falha no arranque se faltar uma variável obrigatória', () => {
    expect(() => lerConfig({ REDIS_URL: 'x' })).toThrow(/RABBITMQ_URL/);
  });

  it('recusa um LOG_LEVEL que não existe', () => {
    expect(() => lerConfig({ ...base, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });

  it('ignora EAPI_PORT, que o Kubernetes injeta como tcp://IP:porta para o Service "eapi"', () => {
    expect(lerConfig({ ...base, EAPI_PORT: 'tcp://10.105.0.1:3000' }).porta).toBe(3000);
  });

  it('PORT e TRUST_PROXY: aceita inteiros válidos e recusa o resto no arranque', () => {
    expect(lerConfig({ ...base, PORT: '8080', TRUST_PROXY: '1' })).toMatchObject({ porta: 8080, trustProxy: 1 });
    expect(lerConfig({ ...base, TRUST_PROXY: '' }).trustProxy).toBe(false);
    for (const PORT of ['abc', '0', '70000', 'tcp://1.2.3.4:3000']) {
      expect(() => lerConfig({ ...base, PORT })).toThrow(/PORT inválido/);
    }
    expect(() => lerConfig({ ...base, TRUST_PROXY: 'sim' })).toThrow(/TRUST_PROXY inválido/);
  });
});
