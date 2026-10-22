import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { applySchema } from '../src/db/schemaRunner.js';
import { createCategory } from '../src/services/categoryService.js';
import { createUser } from '../src/services/userService.js';

let app;
let categories;
let users;

beforeAll(() => {
  applySchema();

  categories = {
    saldoInicial: createCategory({ name: 'Saldo inicial / Aporte', kind: 'INCOME', scope: 'HOUSE' }),
    moveis: createCategory({ name: 'Móveis', kind: 'EXPENSE', scope: 'HOUSE' }),
    eletro: createCategory({ name: 'Eletrodomésticos', kind: 'EXPENSE', scope: 'HOUSE' }),
    salario: createCategory({ name: 'Salário', kind: 'INCOME', scope: 'PERSONAL' }),
    lazer: createCategory({ name: 'Lazer', kind: 'EXPENSE', scope: 'PERSONAL' }),
    investPessoal: createCategory({ name: 'Investimentos pessoais', kind: 'BOTH', scope: 'PERSONAL' }),
  };

  users = {
    rafael: createUser({ name: 'Rafael', username: 'rafael', password: 'senha-forte-123' }),
    pessoa2: createUser({ name: 'Pessoa 2', username: 'pessoa2', password: 'outra-senha-456' }),
  };

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

  it('rejeita módulo pessoal sem sessão', async () => {
    const res = await request(app).get(`/api/personal/${users.rafael.id}/dashboard`);
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

  it('rejeita tipo INVESTMENT no módulo da casa (investir só pelo módulo pessoal)', async () => {
    const res = await agent.post('/api/transactions').send({
      type: 'INVESTMENT',
      amountCents: 1000,
      categoryId: categories.moveis.id,
      description: 'Teste',
      transactionDate: '2026-10-15',
    });
    expect(res.status).toBe(400);
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

  it('filtra por escopo (HOUSE vs PERSONAL)', async () => {
    const house = await agent.get('/api/categories?scope=HOUSE');
    const personal = await agent.get('/api/categories?scope=PERSONAL');
    expect(house.body.some((c) => c.name === 'Móveis')).toBe(true);
    expect(house.body.some((c) => c.name === 'Salário')).toBe(false);
    expect(personal.body.some((c) => c.name === 'Salário')).toBe(true);
    expect(personal.body.some((c) => c.name === 'Móveis')).toBe(false);
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

describe('Módulo pessoal — isolamento do saldo da casa', () => {
  it('entrada pessoal não altera o saldo disponível da casa', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');

    const beforeDash = await agent.get('/api/dashboard?month=2026-10');
    const balanceBefore = beforeDash.body.balanceCents;

    const created = await agent.post(`/api/personal/${users.rafael.id}/transactions`).send({
      type: 'INCOME',
      amountCents: 500_000,
      categoryId: categories.salario.id,
      description: 'Salário outubro',
      transactionDate: '2026-10-05',
    });
    expect(created.status).toBe(201);

    const afterDash = await agent.get('/api/dashboard?month=2026-10');
    expect(afterDash.body.balanceCents).toBe(balanceBefore);
  });

  it('é aberto: o outro usuário também vê os lançamentos pessoais', async () => {
    const agentB = await loginAs('pessoa2', 'outra-senha-456');
    const list = await agentB.get(`/api/personal/${users.rafael.id}/transactions?month=2026-10`);
    expect(list.status).toBe(200);
    expect(list.body.items.some((t) => t.description === 'Salário outubro')).toBe(true);
  });

  it('rejeita categoria da casa dentro do módulo pessoal', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');
    const res = await agent.post(`/api/personal/${users.rafael.id}/transactions`).send({
      type: 'EXPENSE',
      expenseKind: 'NORMAL',
      amountCents: 1000,
      categoryId: categories.moveis.id,
      description: 'Teste escopo errado',
      transactionDate: '2026-10-05',
    });
    expect(res.status).toBe(400);
  });

  it('owner inexistente retorna 404', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');
    const res = await agent.get('/api/personal/999999/dashboard');
    expect(res.status).toBe(404);
  });
});

describe('Módulo pessoal — investimento separado do saldo pessoal', () => {
  it('investimento pessoal não entra no resultado pessoal, mas conta no total investido', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');

    const beforeDash = await agent.get('/api/dashboard?month=2026-10');
    const totalInvestedBefore = beforeDash.body.totalInvestedCents;

    const personalBefore = await agent.get(`/api/personal/${users.rafael.id}/dashboard?month=2026-10`);
    const netBefore = personalBefore.body.netCents;

    const invested = await agent.post(`/api/personal/${users.rafael.id}/transactions`).send({
      type: 'INVESTMENT',
      amountCents: 50_000,
      categoryId: categories.investPessoal.id,
      description: 'CDB Rafael',
      transactionDate: '2026-10-07',
    });
    expect(invested.status).toBe(201);

    const personalAfter = await agent.get(`/api/personal/${users.rafael.id}/dashboard?month=2026-10`);
    expect(personalAfter.body.investmentCents).toBe(50_000);
    expect(personalAfter.body.netCents).toBe(netBefore); // investimento não mexe no líquido pessoal
    expect(personalAfter.body.balanceCents).toBe(personalBefore.body.balanceCents); // nem no saldo pessoal

    const houseDash = await agent.get('/api/dashboard?month=2026-10');
    expect(houseDash.body.totalInvestedCents).toBe(totalInvestedBefore + 50_000);
  });
});

describe('Módulo pessoal — gasto parcelado', () => {
  it('lança o valor de cada parcela (não o total) uma vez por mês', async () => {
    const agent = await loginAs('pessoa2', 'outra-senha-456');

    const created = await agent.post(`/api/personal/${users.pessoa2.id}/transactions`).send({
      type: 'EXPENSE',
      expenseKind: 'INSTALLMENT',
      amountCents: 1000, // R$10,00 por parcela, em 3x
      installments: 3,
      categoryId: categories.lazer.id,
      description: 'Compra parcelada',
      transactionDate: '2026-10-10',
    });
    expect(created.status).toBe(201);
    expect(created.body.amountCents).toBe(1000);
    expect(created.body.installmentTotal).toBe(3);

    const out = await agent.get(`/api/personal/${users.pessoa2.id}/transactions?month=2026-10`);
    const nov = await agent.get(`/api/personal/${users.pessoa2.id}/transactions?month=2026-11`);
    const dez = await agent.get(`/api/personal/${users.pessoa2.id}/transactions?month=2026-12`);

    const parcela1 = out.body.items.find((t) => t.description.includes('(1/3)'));
    const parcela2 = nov.body.items.find((t) => t.description.includes('(2/3)'));
    const parcela3 = dez.body.items.find((t) => t.description.includes('(3/3)'));

    expect(parcela1.amountCents).toBe(1000);
    expect(parcela2.amountCents).toBe(1000);
    expect(parcela3.amountCents).toBe(1000);
  });

  it('editar uma parcela altera só aquela ocorrência', async () => {
    const agent = await loginAs('pessoa2', 'outra-senha-456');
    const out = await agent.get(`/api/personal/${users.pessoa2.id}/transactions?month=2026-10`);
    const parcela1 = out.body.items.find((t) => t.description.includes('(1/3)'));

    const edited = await agent.put(`/api/personal/${users.pessoa2.id}/transactions/${parcela1.id}`).send({
      type: 'EXPENSE',
      expenseKind: 'INSTALLMENT',
      amountCents: 1500,
      categoryId: categories.lazer.id,
      description: 'Compra parcelada (1/3) ajustada',
      transactionDate: '2026-10-10',
    });
    expect(edited.status).toBe(200);
    expect(edited.body.amountCents).toBe(1500);

    const nov = await agent.get(`/api/personal/${users.pessoa2.id}/transactions?month=2026-11`);
    const parcela2 = nov.body.items.find((t) => t.description.includes('(2/3)'));
    expect(parcela2.amountCents).toBe(1000); // outras parcelas continuam intactas
  });
});

describe('Módulo pessoal — gasto fixo', () => {
  it('gera um lançamento real a cada mês consultado, automaticamente', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');

    const template = await agent.post(`/api/personal/${users.rafael.id}/fixed-expenses`).send({
      categoryId: categories.lazer.id,
      description: 'Streaming',
      amountCents: 4_990,
      dayOfMonth: 10,
      startMonth: '2026-10',
    });
    expect(template.status).toBe(201);

    const out = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2026-10`);
    expect(out.body.items.some((t) => t.description === 'Streaming' && t.expenseKind === 'FIXED')).toBe(true);

    // Consultar um mês futuro deve gerar a ocorrência na hora, sozinho.
    const future = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2027-03`);
    const occurrence = future.body.items.find((t) => t.description === 'Streaming');
    expect(occurrence).toBeTruthy();
    expect(occurrence.transactionDate).toBe('2027-03-10');

    // Consultar de novo não duplica.
    const again = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2027-03`);
    expect(again.body.items.filter((t) => t.description === 'Streaming').length).toBe(1);
  });

  it('editar uma ocorrência de gasto fixo altera só aquele mês', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');
    const out = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2026-10`);
    const occurrence = out.body.items.find((t) => t.description === 'Streaming');

    const edited = await agent.put(`/api/personal/${users.rafael.id}/transactions/${occurrence.id}`).send({
      type: 'EXPENSE',
      expenseKind: 'FIXED',
      amountCents: 5_990,
      categoryId: categories.lazer.id,
      description: 'Streaming (reajustado)',
      transactionDate: '2026-10-10',
    });
    expect(edited.status).toBe(200);
    expect(edited.body.amountCents).toBe(5_990);

    const future = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2027-04`);
    const futureOccurrence = future.body.items.find((t) => t.description === 'Streaming');
    expect(futureOccurrence.amountCents).toBe(4_990); // meses seguintes continuam com o valor original
  });

  it('pausar o gasto fixo impede novas ocorrências, mas preserva as já geradas', async () => {
    const agent = await loginAs('rafael', 'senha-forte-123');
    const templates = await agent.get(`/api/personal/${users.rafael.id}/fixed-expenses`);
    const streaming = templates.body.find((t) => t.description === 'Streaming');

    const paused = await agent.patch(`/api/personal/${users.rafael.id}/fixed-expenses/${streaming.id}/status`).send({ active: false });
    expect(paused.status).toBe(200);
    expect(paused.body.active).toBe(0);

    await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2027-06`);
    const junList = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2027-06`);
    expect(junList.body.items.some((t) => t.description === 'Streaming')).toBe(false);

    // Mês já gerado antes da pausa continua existindo.
    const marList = await agent.get(`/api/personal/${users.rafael.id}/transactions?month=2027-03`);
    expect(marList.body.items.some((t) => t.description === 'Streaming')).toBe(true);
  });
});

describe('Metas — casal x pessoal', () => {
  let agent;

  beforeAll(async () => {
    agent = await loginAs('rafael', 'senha-forte-123');
  });

  it('meta do casal combina resultado da casa + pessoal dos dois', async () => {
    const houseDash = await agent.get('/api/dashboard?month=2026-10');
    const rafaelDash = await agent.get(`/api/personal/${users.rafael.id}/dashboard?month=2026-10`);
    const pessoa2Dash = await agent.get(`/api/personal/${users.pessoa2.id}/dashboard?month=2026-10`);
    const expectedCombined = houseDash.body.netCents + rafaelDash.body.netCents + pessoa2Dash.body.netCents;

    const created = await agent.post('/api/goals').send({
      name: 'Meta do casal',
      targetCents: 1,
      recurrence: 'MONTHLY',
    });
    expect(created.status).toBe(201);

    const list = await agent.get('/api/goals?month=2026-10');
    const goal = list.body.find((g) => g.id === created.body.id);
    expect(goal.progress.kind).toBe('SAVINGS');
    expect(goal.progress.currentCents).toBe(expectedCombined);
  });

  it('meta pessoal compara só com o resultado daquela pessoa', async () => {
    const rafaelDash = await agent.get(`/api/personal/${users.rafael.id}/dashboard?month=2026-10`);

    const created = await agent.post('/api/goals').send({
      name: 'Meta pessoal do Rafael',
      targetCents: 1,
      ownerId: users.rafael.id,
      recurrence: 'MONTHLY',
    });
    expect(created.status).toBe(201);

    const list = await agent.get('/api/goals?month=2026-10');
    const goal = list.body.find((g) => g.id === created.body.id);
    expect(goal.progress.kind).toBe('SAVINGS');
    expect(goal.progress.currentCents).toBe(rafaelDash.body.netCents);
  });

  it('meta pessoal só aceita categoria pessoal, meta do casal só aceita categoria da casa', async () => {
    const personalWithHouseCategory = await agent.post('/api/goals').send({
      name: 'Inválida',
      targetCents: 1000,
      categoryId: categories.moveis.id,
      ownerId: users.rafael.id,
      recurrence: 'MONTHLY',
    });
    expect(personalWithHouseCategory.status).toBe(400);

    const coupleWithPersonalCategory = await agent.post('/api/goals').send({
      name: 'Inválida 2',
      targetCents: 1000,
      categoryId: categories.lazer.id,
      recurrence: 'MONTHLY',
    });
    expect(coupleWithPersonalCategory.status).toBe(400);

    const valid = await agent.post('/api/goals').send({
      name: 'Limite lazer Rafael',
      targetCents: 10_000,
      categoryId: categories.lazer.id,
      ownerId: users.rafael.id,
      recurrence: 'MONTHLY',
    });
    expect(valid.status).toBe(201);
  });

  it('rejeita meta ONCE sem mês informado', async () => {
    const res = await agent.post('/api/goals').send({
      name: 'Sem mês',
      targetCents: 1000,
      recurrence: 'ONCE',
    });
    expect(res.status).toBe(400);
  });

  it('exclui uma meta', async () => {
    const created = await agent.post('/api/goals').send({
      name: 'Temporária',
      targetCents: 1000,
      recurrence: 'MONTHLY',
    });
    const del = await agent.delete(`/api/goals/${created.body.id}`);
    expect(del.status).toBe(204);

    const list = await agent.get('/api/goals?month=2026-10');
    expect(list.body.find((g) => g.id === created.body.id)).toBeFalsy();
  });
});
