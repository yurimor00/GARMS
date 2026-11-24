// Regra 1: só a EAPI é pública. Os serviços internos exigem X-Internal-Api-Key em todos os pedidos.
// Resposta dos contratos (ChaveInterna): 401 NAO_AUTORIZADO.
import { timingSafeEqual } from 'node:crypto';
import { ErroApi } from './erros.js';

export const CABECALHO_CHAVE_INTERNA = 'X-Internal-Api-Key';

function iguais(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige o mesmo tamanho; comparar tamanhos primeiro não revela a chave
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Middleware para os serviços internos (PAPIs, SAPIs, Recommendation Service).
 * Os health checks ficam de fora: o Kubernetes chama-os sem chave.
 */
export function exigirChaveInterna(chaveEsperada) {
  if (!chaveEsperada) throw new Error('INTERNAL_API_KEY não está definida');
  return (req, res, next) => {
    if (req.path.startsWith('/health')) return next();
    const recebida = req.get(CABECALHO_CHAVE_INTERNA);
    if (recebida && iguais(recebida, chaveEsperada)) return next();
    next(new ErroApi(401, 'NAO_AUTORIZADO', 'Chave interna em falta ou inválida.'));
  };
}
