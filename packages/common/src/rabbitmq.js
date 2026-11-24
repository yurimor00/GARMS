// Ligação ao RabbitMQ com reconexão automática.
// Por agora só liga e mantém a ligação (para o health check). Publicar e consumir eventos
// (envelope, publisher confirms, ack/nack) entram aqui quando os primeiros eventos forem implementados.
import amqp from 'amqplib';

const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 30000;

/**
 * @param {{ url: string, logger: import('pino').Logger, nomeLigacao?: string }} opcoes
 * @returns {{ ligado: () => boolean, verificar: () => Promise<void>, fechar: () => Promise<void> }}
 */
export function criarLigacaoRabbit({ url, logger, nomeLigacao }) {
  let ligacao = null;
  let aFechar = false;
  let espera = ESPERA_INICIAL_MS;
  let temporizador = null;

  async function ligar() {
    if (aFechar) return;
    try {
      ligacao = await amqp.connect(url, { clientProperties: { connection_name: nomeLigacao } });
      espera = ESPERA_INICIAL_MS;
      logger.info('ligado ao RabbitMQ');

      ligacao.on('error', (erro) => logger.warn({ erro: erro.message }, 'erro na ligação ao RabbitMQ'));
      ligacao.on('close', () => {
        ligacao = null;
        if (!aFechar) {
          logger.warn('ligação ao RabbitMQ fechada; a tentar de novo');
          agendar();
        }
      });
    } catch (erro) {
      ligacao = null;
      logger.warn({ erro: erro.message, proximaTentativaMs: espera }, 'não foi possível ligar ao RabbitMQ');
      agendar();
    }
  }

  function agendar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(ligar, espera);
    temporizador.unref();
    espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
  }

  ligar();

  return {
    ligado: () => ligacao !== null,
    async verificar() {
      if (!ligacao) throw new Error('sem ligação ao RabbitMQ');
    },
    async fechar() {
      aFechar = true;
      clearTimeout(temporizador);
      if (ligacao) await ligacao.close().catch(() => {});
    },
  };
}
