// Erros no formato `Erro` dos contratos: { codigo, mensagem, campos? }.
// `campos` só aparece nos 422 (VALIDACAO).

export class ErroApi extends Error {
  /**
   * @param {number} estado código HTTP
   * @param {string} codigo em MAIÚSCULAS, como nos contratos (ex.: NAO_ENCONTRADO)
   * @param {string} mensagem para o utilizador, em português de Portugal
   * @param {{ campo: string, erro: string }[]} [campos] só em VALIDACAO (422)
   */
  constructor(estado, codigo, mensagem, campos) {
    super(mensagem);
    this.name = 'ErroApi';
    this.estado = estado;
    this.codigo = codigo;
    this.campos = campos;
  }

  paraJson() {
    const corpo = { codigo: this.codigo, mensagem: this.message };
    if (this.campos?.length) corpo.campos = this.campos;
    return corpo;
  }
}

// Atalhos para os erros mais comuns dos contratos
export const naoEncontrado = (mensagem = 'Recurso não encontrado.') =>
  new ErroApi(404, 'NAO_ENCONTRADO', mensagem);

export const validacao = (campos, mensagem = 'Há campos inválidos.') =>
  new ErroApi(422, 'VALIDACAO', mensagem, campos);

export const naoAutenticado = (mensagem = 'Sessão inválida ou expirada.') =>
  new ErroApi(401, 'NAO_AUTENTICADO', mensagem);

export const servicoIndisponivel = (mensagem = 'Serviço temporariamente indisponível.') =>
  new ErroApi(503, 'SERVICO_INDISPONIVEL', mensagem);

/** Rotas que não existem: 404 no formato Erro (em vez da página HTML do Express). */
export function rotaInexistente() {
  return (req, res, next) => next(naoEncontrado('Rota não encontrada.'));
}

/**
 * Middleware de erros (o último do Express). Devolve sempre o formato Erro e regista o erro
 * com o correlationId. Erros inesperados dão 500 sem detalhes para fora; o stack só vai para o log.
 */
export function tratarErros(logger) {
  // eslint-disable-next-line no-unused-vars
  return (erro, req, res, next) => {
    let erroApi = erro;

    if (!(erro instanceof ErroApi)) {
      if (erro.type === 'entity.parse.failed') {
        erroApi = new ErroApi(400, 'PEDIDO_INVALIDO', 'O corpo do pedido não é JSON válido.');
      } else if (erro.type === 'entity.too.large') {
        erroApi = new ErroApi(413, 'PEDIDO_DEMASIADO_GRANDE', 'O corpo do pedido é demasiado grande.');
      } else {
        erroApi = new ErroApi(500, 'ERRO_INTERNO', 'Ocorreu um erro inesperado. Tente novamente.');
      }
    }

    const log = req.log ?? logger;
    if (erroApi.estado >= 500) {
      log.error({ err: erro, codigo: erroApi.codigo }, erro.message);
    } else {
      log.debug({ codigo: erroApi.codigo }, erroApi.message);
    }

    if (res.headersSent) return;
    res.status(erroApi.estado).json(erroApi.paraJson());
  };
}
