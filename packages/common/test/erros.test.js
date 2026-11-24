import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ErroApi, naoEncontrado, rotaInexistente, tratarErros, validacao } from '../src/erros.js';
import { criarLoggerSilencioso } from './utils.js';

function appQueLanca(erro) {
  const app = express();
  app.use(express.json());
  app.post('/eco', (req, res) => res.json(req.body));
  app.get('/falha', () => {
    throw erro;
  });
  app.use(rotaInexistente());
  app.use(tratarErros(criarLoggerSilencioso()));
  return app;
}

describe('ErroApi', () => {
  it('sem campos não inclui "campos" no JSON', () => {
    expect(naoEncontrado().paraJson()).toEqual({ codigo: 'NAO_ENCONTRADO', mensagem: 'Recurso não encontrado.' });
  });

  it('VALIDACAO (422) inclui os campos', () => {
    const erro = validacao([{ campo: 'nome', erro: 'máximo 45 caracteres' }]);
    expect(erro.estado).toBe(422);
    expect(erro.paraJson()).toEqual({
      codigo: 'VALIDACAO',
      mensagem: 'Há campos inválidos.',
      campos: [{ campo: 'nome', erro: 'máximo 45 caracteres' }],
    });
  });
});

describe('tratarErros', () => {
  it('ErroApi devolve o estado e o formato Erro', async () => {
    const res = await request(appQueLanca(new ErroApi(409, 'EMAIL_JA_REGISTADO', 'Email já registado.'))).get('/falha');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ codigo: 'EMAIL_JA_REGISTADO', mensagem: 'Email já registado.' });
  });

  it('erro inesperado dá 500 ERRO_INTERNO sem revelar detalhes', async () => {
    const res = await request(appQueLanca(new Error('password=segredo na query'))).get('/falha');
    expect(res.status).toBe(500);
    expect(res.body.codigo).toBe('ERRO_INTERNO');
    expect(JSON.stringify(res.body)).not.toContain('segredo');
  });

  it('JSON mal formado dá 400 PEDIDO_INVALIDO', async () => {
    const res = await request(appQueLanca(new Error())).post('/eco').set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('PEDIDO_INVALIDO');
  });

  it('rota inexistente dá 404 NAO_ENCONTRADO em JSON', async () => {
    const res = await request(appQueLanca(new Error())).get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' });
  });
});
