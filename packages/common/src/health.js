// Health checks, iguais em todos os serviços (fora do /api/v1 e sem Ingress).
//   GET /health/live → o processo está vivo (livenessProbe). Não verifica dependências:
//                      se o Redis cair, o Kubernetes não deve reiniciar os serviços todos.
//   GET /health      → pronto a receber pedidos (readinessProbe): verifica cada dependência.
//                      200 se todas responderem, 503 se alguma falhar (a réplica sai do load balancer).
import { Router } from 'express';

const LIMITE_MS = 2000;

function comLimite(promessa, ms) {
  let temporizador;
  const limite = new Promise((_, rejeitar) => {
    temporizador = setTimeout(() => rejeitar(new Error(`sem resposta em ${ms} ms`)), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(temporizador));
}

/**
 * @param {{
 *   servico: string,
 *   versao?: string,
 *   verificacoes?: Record<string, () => Promise<unknown>>,
 *   limiteMs?: number,
 *   logger?: import('pino').Logger,
 * }} opcoes cada verificação lança erro (ou rejeita) se a dependência não estiver disponível
 */
export function rotasHealth({ servico, versao = '0.0.0', verificacoes = {}, limiteMs = LIMITE_MS, logger }) {
  const router = Router();

  router.get('/health/live', (req, res) => {
    res.json({ estado: 'ok', servico, versao });
  });

  router.get('/health', async (req, res) => {
    const nomes = Object.keys(verificacoes);
    const resultados = await Promise.allSettled(
      nomes.map((nome) => comLimite(Promise.resolve().then(verificacoes[nome]), limiteMs)),
    );

    const dependencias = {};
    let tudoOk = true;
    resultados.forEach((resultado, i) => {
      if (resultado.status === 'fulfilled') {
        dependencias[nomes[i]] = 'ok';
      } else {
        tudoOk = false;
        dependencias[nomes[i]] = 'falha';
        (req.log ?? logger)?.warn({ dependencia: nomes[i], erro: resultado.reason?.message }, 'dependência indisponível');
      }
    });

    res.status(tudoOk ? 200 : 503).json({ estado: tudoOk ? 'ok' : 'degradado', servico, versao, dependencias });
  });

  return router;
}
