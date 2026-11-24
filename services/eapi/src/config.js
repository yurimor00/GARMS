// Configuração da EAPI, toda a partir de variáveis de ambiente (.env local, Secrets no Kubernetes).
// Falha logo no arranque se faltar alguma obrigatória, em vez de rebentar no primeiro pedido.

const NIVEIS_LOG = ['error', 'warn', 'info', 'debug'];

export function lerConfig(env = process.env) {
  const emFalta = ['REDIS_URL', 'RABBITMQ_URL'].filter((nome) => !env[nome]);
  if (emFalta.length) {
    throw new Error(`Faltam variáveis de ambiente: ${emFalta.join(', ')} (ver .env.example)`);
  }

  const nivelLog = env.LOG_LEVEL ?? 'info';
  if (!NIVEIS_LOG.includes(nivelLog)) {
    throw new Error(`LOG_LEVEL inválido: ${nivelLog} (usar ${NIVEIS_LOG.join(', ')})`);
  }

  // Só PORT. Não usar <SERVICO>_PORT: o Kubernetes injeta variáveis com esse nome para cada Service
  // (ex.: EAPI_PORT=tcp://10.0.0.1:3000). No compose, EAPI_PORT é só a porta publicada no PC.
  const porta = inteiro(env.PORT, 3000, 'PORT', 1, 65535);

  return {
    porta,
    nivelLog,
    redisUrl: env.REDIS_URL,
    rabbitmqUrl: env.RABBITMQ_URL,
    // Atrás do Traefik (e do Cloudflare) o IP do cliente vem em X-Forwarded-For.
    // Só confiar nesse cabeçalho quando há mesmo um proxy à frente (no cluster), senão pode ser falsificado.
    trustProxy: env.TRUST_PROXY ? inteiro(env.TRUST_PROXY, 0, 'TRUST_PROXY', 0, 10) : false,
  };
}

function inteiro(valor, omissao, nome, minimo, maximo) {
  if (valor === undefined || valor === '') return omissao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new Error(`${nome} inválido: "${valor}" (inteiro entre ${minimo} e ${maximo})`);
  }
  return numero;
}
