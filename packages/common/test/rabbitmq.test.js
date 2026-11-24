import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarLoggerSilencioso } from './utils.js';

// amqplib falso: cada connect() devolve uma ligação que se pode "deitar abaixo" nos testes
const amqpFalso = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('amqplib', () => ({ default: amqpFalso }));

const { criarLigacaoRabbit } = await import('../src/rabbitmq.js');

function ligacaoFalsa() {
  const ligacao = new EventEmitter();
  ligacao.close = vi.fn(async () => ligacao.emit('close'));
  return ligacao;
}

const opcoes = { url: 'amqp://teste', logger: criarLoggerSilencioso(), nomeLigacao: 'teste' };

describe('criarLigacaoRabbit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    amqpFalso.connect.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('liga no arranque e verificar() passa', async () => {
    amqpFalso.connect.mockResolvedValue(ligacaoFalsa());
    const rabbit = criarLigacaoRabbit(opcoes);
    await vi.waitFor(() => expect(rabbit.ligado()).toBe(true));
    await expect(rabbit.verificar()).resolves.toBeUndefined();
    expect(amqpFalso.connect).toHaveBeenCalledWith('amqp://teste', { clientProperties: { connection_name: 'teste' } });
    await rabbit.fechar();
  });

  it('se o broker não estiver disponível, verificar() falha e volta a tentar com espera crescente', async () => {
    amqpFalso.connect.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    amqpFalso.connect.mockResolvedValue(ligacaoFalsa());
    const rabbit = criarLigacaoRabbit(opcoes);

    await vi.waitFor(() => expect(amqpFalso.connect).toHaveBeenCalledTimes(1));
    await expect(rabbit.verificar()).rejects.toThrow(/sem ligação/);

    await vi.advanceTimersByTimeAsync(1000); // 1.ª nova tentativa ao fim de 1 s
    expect(amqpFalso.connect).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999); // a 2.ª espera é de 2 s
    expect(amqpFalso.connect).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(amqpFalso.connect).toHaveBeenCalledTimes(3);
    await vi.waitFor(() => expect(rabbit.ligado()).toBe(true));
    await rabbit.fechar();
  });

  it('se a ligação cair, volta a ligar sozinho', async () => {
    const primeira = ligacaoFalsa();
    amqpFalso.connect.mockResolvedValueOnce(primeira).mockResolvedValue(ligacaoFalsa());
    const rabbit = criarLigacaoRabbit(opcoes);
    await vi.waitFor(() => expect(rabbit.ligado()).toBe(true));

    primeira.emit('error', new Error('heartbeat timeout'));
    primeira.emit('close');
    expect(rabbit.ligado()).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(rabbit.ligado()).toBe(true));
    expect(amqpFalso.connect).toHaveBeenCalledTimes(2);
    await rabbit.fechar();
  });

  it('fechar() fecha a ligação e não volta a ligar', async () => {
    const ligacao = ligacaoFalsa();
    amqpFalso.connect.mockResolvedValue(ligacao);
    const rabbit = criarLigacaoRabbit(opcoes);
    await vi.waitFor(() => expect(rabbit.ligado()).toBe(true));

    await rabbit.fechar();
    expect(ligacao.close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000);
    expect(amqpFalso.connect).toHaveBeenCalledTimes(1);
  });
});
