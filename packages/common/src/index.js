// @garms/common: código partilhado pelos serviços do GARMS.
export { CABECALHO_CORRELATION_ID, obterCorrelationId, comCorrelationId, correlationIdMiddleware } from './contexto.js';
export { criarLogger, registoPedidos, CAMPOS_OCULTOS } from './logger.js';
export {
  ErroApi,
  naoEncontrado,
  validacao,
  naoAutenticado,
  servicoIndisponivel,
  rotaInexistente,
  tratarErros,
} from './erros.js';
export { CABECALHO_CHAVE_INTERNA, exigirChaveInterna } from './chaveInterna.js';
export { rotasHealth } from './health.js';
export { criarLigacaoRabbit } from './rabbitmq.js';
