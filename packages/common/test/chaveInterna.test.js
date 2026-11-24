import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { exigirChaveInterna } from '../src/chaveInterna.js';
import { tratarErros } from '../src/erros.js';
import { criarLoggerSilencioso } from './utils.js';

function appInterna() {
  const app = express();
  app.use(exigirChaveInterna('chave-certa'));
  app.get('/health', (req, res) => res.json({ estado: 'ok' }));
  app.get('/api/v1/users', (req, res) => res.json([]));
  app.use(tratarErros(criarLoggerSilencioso()));
  return app;
}

describe('exigirChaveInterna', () => {
  it('sem chave: 401 NAO_AUTORIZADO', async () => {
    const res = await request(appInterna()).get('/api/v1/users');
    expect(res.status).toBe(401);
    expect(res.body.codigo).toBe('NAO_AUTORIZADO');
  });

  it('chave errada (incluindo tamanho diferente): 401', async () => {
    for (const chave of ['chave-errada', 'x']) {
      const res = await request(appInterna()).get('/api/v1/users').set('X-Internal-Api-Key', chave);
      expect(res.status).toBe(401);
    }
  });

  it('chave certa: passa', async () => {
    const res = await request(appInterna()).get('/api/v1/users').set('X-Internal-Api-Key', 'chave-certa');
    expect(res.status).toBe(200);
  });

  it('o /health não precisa de chave (probes do Kubernetes)', async () => {
    const res = await request(appInterna()).get('/health');
    expect(res.status).toBe(200);
  });

  it('recusa arrancar sem chave configurada', () => {
    expect(() => exigirChaveInterna(undefined)).toThrow(/INTERNAL_API_KEY/);
  });
});
