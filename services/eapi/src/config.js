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

  return {
    porta: Number(env.EAPI_PORT ?? env.PORT ?? 3000),
    nivelLog,
    redisUrl: env.REDIS_URL,
    rabbitmqUrl: env.RABBITMQ_URL,
    // Atrás do Traefik (e do Cloudflare) o IP do cliente vem em X-Forwarded-For.
    // Só confiar nesse cabeçalho quando há mesmo um proxy à frente (no cluster), senão pode ser falsificado.
    trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : false,
  };
}
