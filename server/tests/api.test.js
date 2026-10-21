import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { applySchema } from '../src/db/schemaRunner.js';
import { createCategory } from '../src/services/categoryService.js';
import { createUser } from '../src/services/userService.js';

let app;
let categories;

beforeAll(() => {
  applySchema();

  categories = {
    saldoInicial: createCategory({ name: 'Saldo inicial / Aporte', kind: 'INCOME' }),
    moveis: createCategory({ name: 'Móveis', kind: 'EXPENSE' }),
    eletro: createCategory({ name: 'Eletrodomésticos', kind: 'EXPENSE' }),
  };

  createUser({ name: 'Rafael', username: 'rafael', password: 'senha-forte-123' });
  createUser({ name: 'Pessoa 2', username: 'pessoa2', password: 'outra-senha-456' });

  app = createApp();
});

async function loginAs(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return agent;
}

describe('Cenário 10 — segurança: rotas de dados exigem autenticação', () => {
  it('rejeita dashboard sem sessão', async () => {
    const res = await request(app).get('/api/dashboard?month=2026-10');
    expect(res.status).toBe(401);
  });

  it('rejeita listagem de movimentações sem sessão', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('rejeita listagem de categorias sem sessão', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('rejeita login com senha incorreta', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'rafael', password: 'errada' });
    expect(res.status).toBe(401);
  });
});

describe('Fluxo financeiro completo (cenários 1 a 5 do documento de aceite)', () => {
  let agent;
  let expenseId;

  it('login válido retorna o usuário autenticado', async () => {
    agent = await loginAs('rafael', 'senha-forte-123');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('rafael');
  });

  it('Cenário 1 — saldo inicial: entrada de R$ 10.000,00 em 01/10', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'INCOME',
      amountCents: 1_000_000,
      categoryId: categories.saldoInicial.id,
      description: 'Saldo inicial para a casa',
      transactionDate: '2026-10-01',
    });
    expect(res.status).toBe(201);

    const dash = await agent.get('/api/dashboard?month=2026-10');
    expect(dash.body.incomeCents).toBe(1_000_000);
    expect(dash.body.balanceCents).toBe(1_000_000);
  });

  it('Cenário 2 — compra de R$ 2.500,00 em Móveis', async () => {
    const created = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 250_000,
      categoryId: categories.moveis.id,
      description: 'Sofá sala',
      transactionDate: '2026-10-10',
    });
    expect(created.status).toBe(201);
    expenseId = created.body.id;

    const dash = await agent.get('/api/dashboard?month=2026-10');
    expect(dash.body.expenseCents).toBe(250_000);
    expect(dash.body.netCents).toBe(750_000);
    expect(dash.body.balanceCents).toBe(750_000);
  });

  it('Cenário 3 — novo mês não contamina o mês anterior, saldo acumula', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'INCOME',
      amountCents: 100_000,
      categoryId: categories.saldoInicial.id,
      description: 'Aporte novembro',
      transactionDate: '2026-11-05',
    });
    expect(res.status).toBe(201);

    const octDash = await agent.get('/api/dashboard?month=2026-10');
    expect(octDash.body.incomeCents).toBe(1_000_000);
    expect(octDash.body.expenseCents).toBe(250_000);

    const novDash = await agent.get('/api/dashboard?month=2026-11');
    expect(novDash.body.incomeCents).toBe(100_000);
    expect(novDash.body.expenseCents).toBe(0);
    expect(novDash.body.balanceCents).toBe(850_000);
  });

  it('Cenário 4 — edição da saída de R$ 2.500,00 para R$ 2.000,00 aumenta o saldo em R$ 500,00', async () => {
    const res = await agent.put(`/api/transactions/${expenseId}`).send({
      type: 'EXPENSE',
      amountCents: 200_000,
      categoryId: categories.moveis.id,
      description: 'Sofá sala (ajustado)',
      transactionDate: '2026-10-10',
    });
    expect(res.status).toBe(200);

    const dash = await agent.get('/api/dashboard?month=2026-10');
    expect(dash.body.expenseCents).toBe(200_000);
    expect(dash.body.balanceCents).toBe(800_000);
  });

  it('Cenário 5 — exclusão reflete imediatamente no dashboard', async () => {
    const del = await agent.delete(`/api/transactions/${expenseId}`);
    expect(del.status).toBe(204);

    const dash = await agent.get('/api/dashboard?month=2026-10');
    expect(dash.body.expenseCents).toBe(0);
    expect(dash.body.balanceCents).toBe(1_000_000);
  });
});

describe('Cenário 6 — duas pessoas, mesmo banco', () => {
  it('movimentação criada pelo usuário A aparece para o usuário B', async () => {
    const agentA = await loginAs('rafael', 'senha-forte-123');
    const agentB = await loginAs('pessoa2', 'outra-senha-456');

    const created = await agentA.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 86_000,
      categoryId: categories.eletro.id,
      description: 'Geladeira',
      transactionDate: '2026-10-12',
    });
    expect(created.status).toBe(201);

    const dashForB = await agentB.get('/api/dashboard?month=2026-10');
    const found = dashForB.body.recentTransactions.find((t) => t.description === 'Geladeira');
    expect(found).toBeTruthy();
    expect(found.createdByName).toBe('Rafael');
  });
});

describe('Cenário 9 — validações obrigatórias', () => {
  let agent;

  beforeAll(async () => {
    agent = await loginAs('rafael', 'senha-forte-123');
  });

  it('rejeita valor zero', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 0,
      categoryId: categories.moveis.id,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita valor negativo', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: -500,
      categoryId: categories.moveis.id,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
  });

  it('rejeita tipo inválido', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'TRANSFER',
      amountCents: 1000,
      categoryId: categories.moveis.id,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
  });

  it('rejeita categoria inexistente', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 1000,
      categoryId: 999999,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
  });

  it('rejeita categoria inativa para novos lançamentos', async () => {
    const temp = createCategory({ name: 'Categoria temporária', kind: 'EXPENSE' });
    db.prepare('UPDATE categories SET active = 0 WHERE id = ?').run(temp.id);

    const res = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 1000,
      categoryId: temp.id,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
  });

  it('rejeita data inválida', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 1000,
      categoryId: categories.moveis.id,
      description: 'Teste',
      transactionDate: '15/10/2026',
    });
    expect(res.status).toBe(400);
  });

  it('rejeita descrição vazia', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'EXPENSE',
      amountCents: 1000,
      categoryId: categories.moveis.id,
      description: '   ',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
  });

  it('editar/excluir movimentação inexistente retorna 404', async () => {
    const edit = await agent.put('/api/transactions/999999').send({
      type: 'EXPENSE',
      amountCents: 1000,
      categoryId: categories.moveis.id,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(edit.status).toBe(404);

    const del = await agent.delete('/api/transactions/999999');
    expect(del.status).toBe(404);
  });
});

describe('Categorias', () => {
  let agent;

  beforeAll(async () => {
    agent = await loginAs('rafael', 'senha-forte-123');
  });

  it('cria, edita e inativa uma categoria', async () => {
    const created = await agent.post('/api/categories').send({ name: 'Segurança', kind: 'EXPENSE' });
    expect(created.status).toBe(201);

    const updated = await agent.put(`/api/categories/${created.body.id}`).send({ name: 'Segurança residencial' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Segurança residencial');

    const inactivated = await agent.patch(`/api/categories/${created.body.id}/status`).send({ active: false });
    expect(inactivated.status).toBe(200);
    expect(inactivated.body.active).toBe(0);
  });

  it('não permite nome de categoria duplicado', async () => {
    const res = await agent.post('/api/categories').send({ name: 'Móveis', kind: 'EXPENSE' });
    expect(res.status).toBe(409);
  });
});

describe('Exportação CSV', () => {
  it('retorna CSV com cabeçalho esperado', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');
    const res = await agent.get('/api/transactions/export.csv?month=2026-10');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Data;Tipo;Categoria;Descrição;Valor (R$);Responsável');
  });
});
