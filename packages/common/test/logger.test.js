import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { correlationIdMiddleware, comCorrelationId, obterCorrelationId } from '../src/contexto.js';
import { registoPedidos } from '../src/logger.js';
import { criarLoggerEmMemoria } from './utils.js';

function appComLogs() {
  const { logger, linhas } = criarLoggerEmMemoria();
  const app = express();
  app.use(correlationIdMiddleware());
  app.use(registoPedidos(logger));
  app.get('/ok', (req, res) => {
    logger.info({ email: 'ana@exemplo.pt' }, 'dentro da rota');
    res.json({ correlationId: obterCorrelationId() });
  });
  app.get('/health', (req, res) => res.json({ estado: 'ok' }));
  app.get('/proibido', (req, res) => res.status(404).json({}));
  return { app, linhas };
}

describe('correlationId', () => {
  it('reutiliza o X-Correlation-Id recebido e devolve-o', async () => {
    const { app } = appComLogs();
    const res = await request(app).get('/ok').set('X-Correlation-Id', 'abc-123');
    expect(res.headers['x-correlation-id']).toBe('abc-123');
    expect(res.body.correlationId).toBe('abc-123');
  });

  it('cria um UUID quando não vem nenhum, ou quando o recebido é inválido', async () => {
    const { app } = appComLogs();
    const semCabecalho = await request(app).get('/ok');
    const invalido = await request(app).get('/ok').set('X-Correlation-Id', 'com espaços e <html>');
    for (const res of [semCabecalho, invalido]) {
      expect(res.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('comCorrelationId define o ID fora de pedidos HTTP (ex.: eventos)', () => {
    expect(comCorrelationId('evento-1', () => obterCorrelationId())).toBe('evento-1');
    expect(obterCorrelationId()).toBeUndefined();
  });
});

describe('logger', () => {
  it('escreve JSON com level, servico e correlationId em todas as linhas do pedido', async () => {
    const { app, linhas } = appComLogs();
    await request(app).get('/ok').set('X-Correlation-Id', 'pedido-42');
    expect(linhas.length).toBeGreaterThanOrEqual(2);
    for (const linha of linhas) {
      expect(linha).toMatchObject({ servico: 'teste', correlationId: 'pedido-42' });
      expect(['error', 'warn', 'info', 'debug']).toContain(linha.level);
      expect(linha.time).toMatch(/Z$/); // ISO em UTC
    }
  });

  it('oculta emails e não regista cabeçalhos (Authorization, chave interna)', async () => {
    const { app, linhas } = appComLogs();
    await request(app).get('/ok').set('Authorization', 'Bearer token-secreto').set('X-Internal-Api-Key', 'chave');
    const tudo = JSON.stringify(linhas);
    expect(tudo).not.toContain('ana@exemplo.pt');
    expect(tudo).not.toContain('token-secreto');
    expect(tudo).not.toContain('chave"');
  });

  it('nível por estado: 4xx → warn, /health → debug', async () => {
    const { app, linhas } = appComLogs();
    await request(app).get('/proibido');
    await request(app).get('/health');
    const pedidos = linhas.filter((l) => l.req);
    expect(pedidos.find((l) => l.req.path === '/proibido').level).toBe('warn');
    expect(pedidos.find((l) => l.req.path === '/health').level).toBe('debug');
  });
});
