import { Writable } from 'node:stream';
import { criarLogger } from '../src/logger.js';

/** Logger que guarda as linhas em memória (para verificar o que se escreve nos logs). */
export function criarLoggerEmMemoria(nivel = 'debug') {
  const linhas = [];
  const destino = new Writable({
    write(pedaco, _codificacao, feito) {
      linhas.push(JSON.parse(pedaco.toString()));
      feito();
    },
  });
  return { logger: criarLogger({ servico: 'teste', nivel, destino }), linhas };
}

export function criarLoggerSilencioso() {
  return criarLogger({ servico: 'teste', nivel: 'silent' });
}
