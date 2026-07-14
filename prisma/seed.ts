/**
 * Seed de demonstração do Dark Code CRM (apenas desenvolvimento).
 * Execução: npm run db:seed
 *
 * Credenciais de desenvolvimento (NÃO usar em produção):
 *   admin@darkcode.dev / DarkCode123
 *   demais usuários:    <usuario>@darkcode.dev / DarkCode123
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const now = new Date();
function daysAgo(days: number, hour = 12): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}
function daysAhead(days: number): Date {
  return daysAgo(-days);
}

async function main() {
  const existing = await db.user.count();
  if (existing > 0) {
    console.log("Banco já possui usuários — seed abortado para não duplicar dados.");
    console.log("Para recriar do zero: npx prisma migrate reset");
    return;
  }

  const passwordHash = await bcrypt.hash("DarkCode123", 12);

  // ---------- Usuários ----------
  const admin = await db.user.create({
    data: {
      fullName: "Alan Turing",
      username: "alan.admin",
      email: "admin@darkcode.dev",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      position: "Administrador",
      area: "Administrativo",
      lastAccessAt: daysAgo(0),
    },
  });

  const [gestorAna, gestorBruno] = await Promise.all([
    db.user.create({
      data: {
        fullName: "Ana Lovelace",
        username: "ana.gestora",
        email: "ana@darkcode.dev",
        passwordHash,
        role: "MANAGER",
        status: "ACTIVE",
        position: "Gestora de Projetos",
        area: "Gestão de projetos",
        approvedById: admin.id,
        lastAccessAt: daysAgo(1),
      },
    }),
    db.user.create({
      data: {
        fullName: "Bruno Hopper",
        username: "bruno.gestor",
        email: "bruno@darkcode.dev",
        passwordHash,
        role: "MANAGER",
        status: "ACTIVE",
        position: "Gestor de Tráfego",
        area: "Tráfego",
        approvedById: admin.id,
        lastAccessAt: daysAgo(2),
      },
    }),
  ]);

  const collaboratorData = [
    { fullName: "Carla Ritchie", username: "carla.dev", email: "carla@darkcode.dev", position: "Desenvolvedora Full Stack", area: "Desenvolvimento" },
    { fullName: "Diego Torvalds", username: "diego.dev", email: "diego@darkcode.dev", position: "Desenvolvedor Backend", area: "Desenvolvimento" },
    { fullName: "Elisa Wozniak", username: "elisa.integ", email: "elisa@darkcode.dev", position: "Especialista em Integrações", area: "Integrações" },
    { fullName: "Fábio Kernighan", username: "fabio.auto", email: "fabio@darkcode.dev", position: "Especialista em Automações", area: "Automações" },
    { fullName: "Gabriela Knuth", username: "gabi.trafego", email: "gabi@darkcode.dev", position: "Gestora de Tráfego", area: "Tráfego" },
  ];
  const collaborators = [];
  for (const c of collaboratorData) {
    collaborators.push(
      await db.user.create({
        data: { ...c, passwordHash, role: "COLLABORATOR", status: "ACTIVE", approvedById: admin.id, lastAccessAt: daysAgo(1) },
      }),
    );
  }
  const [carla, diego, elisa, fabio, gabi] = collaborators;

  // Usuário pendente para testar o fluxo de aprovação
  await db.user.create({
    data: {
      fullName: "Henrique Pendente",
      username: "henrique.novo",
      email: "henrique@darkcode.dev",
      passwordHash,
      role: "COLLABORATOR",
      status: "PENDING",
    },
  });

  // ---------- Clientes ----------
  const clientData = [
    { legalName: "Nexa Educação LTDA", tradeName: "Nexa Cursos", document: "12.345.678/0001-90", contactName: "Marcos Paiva", email: "marcos@nexacursos.com.br", phone: "(11) 3232-1010", whatsapp: "(11) 98888-0001", website: "https://nexacursos.com.br", segment: "Educação digital", product: "Gestão de tráfego + funil de vendas", contractCents: 1200000, status: "ACTIVE", ownerId: gestorBruno.id, startDate: daysAgo(180) },
    { legalName: "Vitalle Saúde e Bem-Estar ME", tradeName: "Clínica Vitalle", document: "23.456.789/0001-01", contactName: "Dra. Paula Reis", email: "paula@clinicavitalle.com.br", phone: "(21) 2525-2020", whatsapp: "(21) 97777-0002", website: "https://clinicavitalle.com.br", segment: "Saúde", product: "Site + automação de agendamentos", contractCents: 850000, status: "ACTIVE", ownerId: gestorAna.id, startDate: daysAgo(120) },
    { legalName: "TechFin Soluções Financeiras SA", tradeName: "TechFin", document: "34.567.890/0001-12", contactName: "Ricardo Alves", email: "ricardo@techfin.com.br", phone: "(11) 4040-3030", whatsapp: "(11) 96666-0003", website: "https://techfin.com.br", segment: "Fintech", product: "Integrações de pagamento + dashboard", contractCents: 2400000, status: "ONBOARDING", ownerId: gestorAna.id, startDate: daysAgo(25) },
    { legalName: "Impulso Fitness LTDA", tradeName: "Impulso Academia", document: "45.678.901/0001-23", contactName: "Juliana Costa", email: "juliana@impulsofit.com.br", phone: "(31) 3535-4040", whatsapp: "(31) 95555-0004", website: "https://impulsofit.com.br", segment: "Fitness", product: "Lançamento digital + tráfego pago", contractCents: 600000, status: "NEGOTIATION", ownerId: gestorBruno.id, startDate: daysAgo(10) },
    { legalName: "Sabor da Serra Alimentos EIRELI", tradeName: "Sabor da Serra", document: "56.789.012/0001-34", contactName: "Antônio Moreira", email: "antonio@sabordaserra.com.br", phone: "(35) 3636-5050", whatsapp: "(35) 94444-0005", website: "https://sabordaserra.com.br", segment: "Alimentação", product: "E-commerce + automações de pedido", contractCents: 950000, status: "DEFAULTING", ownerId: gestorAna.id, startDate: daysAgo(240) },
  ];
  const clients = [];
  for (const c of clientData) {
    clients.push(await db.client.create({ data: c }));
  }
  const [nexa, vitalle, techfin, impulso, sabor] = clients;

  // ---------- Projetos ----------
  const projectData = [
    { name: "Funil de lançamento Q3", clientId: nexa.id, managerId: gestorBruno.id, description: "Estruturação completa do funil de lançamento do curso principal.", scope: "Páginas, tráfego, e-mails e automações do lançamento.", status: "IN_PROGRESS", priority: "HIGH", contractCents: 450000, receivedCents: 225000, startDate: daysAgo(40), dueDate: daysAhead(20), memberIds: [gabi.id, fabio.id, carla.id] },
    { name: "Portal do aluno 2.0", clientId: nexa.id, managerId: gestorAna.id, description: "Nova área de membros com gamificação.", scope: "Frontend, backend, integração com plataforma de pagamento.", status: "IN_PROGRESS", priority: "URGENT", contractCents: 750000, receivedCents: 250000, startDate: daysAgo(60), dueDate: daysAhead(35), memberIds: [carla.id, diego.id] },
    { name: "Automação de agendamentos", clientId: vitalle.id, managerId: gestorAna.id, description: "Integração agenda + WhatsApp + lembretes automáticos.", scope: "Automações n8n, API do WhatsApp, painel interno.", status: "IN_REVIEW", priority: "MEDIUM", contractCents: 380000, receivedCents: 380000, startDate: daysAgo(75), dueDate: daysAhead(7), memberIds: [fabio.id, elisa.id] },
    { name: "Site institucional Vitalle", clientId: vitalle.id, managerId: gestorAna.id, description: "Novo site institucional responsivo.", scope: "Design, desenvolvimento e SEO técnico.", status: "DONE", priority: "MEDIUM", contractCents: 250000, receivedCents: 250000, startDate: daysAgo(110), dueDate: daysAgo(15), memberIds: [carla.id] },
    { name: "Integração gateway PIX", clientId: techfin.id, managerId: gestorAna.id, description: "Integração com múltiplos gateways de pagamento.", scope: "APIs, webhooks, conciliação e painel.", status: "IN_PROGRESS", priority: "CRITICAL", contractCents: 1200000, receivedCents: 400000, startDate: daysAgo(20), dueDate: daysAhead(45), memberIds: [diego.id, elisa.id] },
    { name: "Dashboard executivo", clientId: techfin.id, managerId: gestorAna.id, description: "Dashboard de métricas em tempo real.", scope: "ETL, gráficos e alertas.", status: "PLANNING", priority: "HIGH", contractCents: 900000, receivedCents: 0, startDate: daysAgo(5), dueDate: daysAhead(60), memberIds: [carla.id, diego.id] },
    { name: "Campanha de captação", clientId: impulso.id, managerId: gestorBruno.id, description: "Campanha de matrículas para o próximo trimestre.", scope: "Criativos, tráfego pago e landing pages.", status: "WAITING_CLIENT", priority: "MEDIUM", contractCents: 300000, receivedCents: 100000, startDate: daysAgo(12), dueDate: daysAhead(15), memberIds: [gabi.id] },
    { name: "Migração e-commerce", clientId: sabor.id, managerId: gestorAna.id, description: "Migração da loja para nova plataforma.", scope: "Catálogo, pagamentos, frete e automações.", status: "PAUSED", priority: "LOW", contractCents: 550000, receivedCents: 275000, startDate: daysAgo(90), dueDate: daysAgo(10), memberIds: [carla.id, fabio.id, elisa.id] },
  ];
  const projects = [];
  for (const { memberIds, ...p } of projectData) {
    const project = await db.project.create({ data: p });
    await db.projectMember.createMany({
      data: memberIds.map((userId) => ({ projectId: project.id, userId })),
    });
    projects.push(project);
  }

  // ---------- Tags ----------
  const tagNames: [string, string][] = [
    ["urgente", "#EF4444"],
    ["tráfego", "#F59E0B"],
    ["dev", "#7C3AED"],
    ["automação", "#22C55E"],
    ["integração", "#0EA5E9"],
  ];
  const tags = [];
  for (const [name, color] of tagNames) {
    tags.push(await db.tag.create({ data: { name, color } }));
  }

  // ---------- Tarefas ----------
  type TaskSeed = {
    title: string;
    projectIdx: number;
    responsibleId: string;
    status: string;
    priority: string;
    dueInDays: number; // negativo = atrasada
    estimatedHours?: number;
    description?: string;
  };
  const taskSeeds: TaskSeed[] = [
    { title: "Criar página de captura do lançamento", projectIdx: 0, responsibleId: carla.id, status: "DONE", priority: "HIGH", dueInDays: -20, estimatedHours: 12 },
    { title: "Configurar campanhas de aquecimento", projectIdx: 0, responsibleId: gabi.id, status: "IN_PROGRESS", priority: "HIGH", dueInDays: 3, estimatedHours: 8 },
    { title: "Sequência de e-mails do lançamento", projectIdx: 0, responsibleId: fabio.id, status: "IN_REVIEW", priority: "MEDIUM", dueInDays: 5, estimatedHours: 6 },
    { title: "Pixel e eventos de conversão", projectIdx: 0, responsibleId: gabi.id, status: "NOT_STARTED", priority: "URGENT", dueInDays: -2, estimatedHours: 4 },
    { title: "Design do novo portal do aluno", projectIdx: 1, responsibleId: carla.id, status: "DONE", priority: "HIGH", dueInDays: -30, estimatedHours: 20 },
    { title: "API de gamificação", projectIdx: 1, responsibleId: diego.id, status: "IN_PROGRESS", priority: "URGENT", dueInDays: 8, estimatedHours: 32 },
    { title: "Migrar base de alunos", projectIdx: 1, responsibleId: diego.id, status: "BLOCKED", priority: "CRITICAL", dueInDays: -5, estimatedHours: 16, description: "Bloqueada aguardando acesso ao banco legado." },
    { title: "Tela de progresso do aluno", projectIdx: 1, responsibleId: carla.id, status: "IN_ANALYSIS", priority: "MEDIUM", dueInDays: 12, estimatedHours: 10 },
    { title: "Fluxo de lembretes WhatsApp", projectIdx: 2, responsibleId: fabio.id, status: "IN_REVIEW", priority: "HIGH", dueInDays: 2, estimatedHours: 14 },
    { title: "Integração Google Calendar", projectIdx: 2, responsibleId: elisa.id, status: "DONE", priority: "MEDIUM", dueInDays: -8, estimatedHours: 8 },
    { title: "Painel de confirmações", projectIdx: 2, responsibleId: fabio.id, status: "IN_PROGRESS", priority: "MEDIUM", dueInDays: 4, estimatedHours: 6 },
    { title: "Ajustes finais de SEO", projectIdx: 3, responsibleId: carla.id, status: "DONE", priority: "LOW", dueInDays: -16, estimatedHours: 4 },
    { title: "Publicar site em produção", projectIdx: 3, responsibleId: carla.id, status: "DONE", priority: "HIGH", dueInDays: -15, estimatedHours: 2 },
    { title: "Mapear APIs dos gateways", projectIdx: 4, responsibleId: elisa.id, status: "DONE", priority: "HIGH", dueInDays: -10, estimatedHours: 10 },
    { title: "Webhook de conciliação PIX", projectIdx: 4, responsibleId: diego.id, status: "IN_PROGRESS", priority: "CRITICAL", dueInDays: 6, estimatedHours: 24 },
    { title: "Ambiente de homologação", projectIdx: 4, responsibleId: diego.id, status: "WAITING_THIRD_PARTY", priority: "HIGH", dueInDays: 1, estimatedHours: 4 },
    { title: "Testes de carga na API", projectIdx: 4, responsibleId: elisa.id, status: "NOT_STARTED", priority: "MEDIUM", dueInDays: 18, estimatedHours: 12 },
    { title: "Levantamento de métricas-chave", projectIdx: 5, responsibleId: carla.id, status: "IN_ANALYSIS", priority: "MEDIUM", dueInDays: 10, estimatedHours: 6 },
    { title: "Prova de conceito do ETL", projectIdx: 5, responsibleId: diego.id, status: "NOT_STARTED", priority: "HIGH", dueInDays: 20, estimatedHours: 16 },
    { title: "Criativos da campanha", projectIdx: 6, responsibleId: gabi.id, status: "WAITING_CLIENT", priority: "MEDIUM", dueInDays: 3, estimatedHours: 8 },
    { title: "Estrutura de campanhas Meta Ads", projectIdx: 6, responsibleId: gabi.id, status: "NOT_STARTED", priority: "MEDIUM", dueInDays: 9, estimatedHours: 6 },
    { title: "Landing page de matrícula", projectIdx: 6, responsibleId: carla.id, status: "NOT_STARTED", priority: "HIGH", dueInDays: 7, estimatedHours: 10 },
    { title: "Auditoria do catálogo atual", projectIdx: 7, responsibleId: fabio.id, status: "DONE", priority: "LOW", dueInDays: -45, estimatedHours: 8 },
    { title: "Mapeamento de integrações de frete", projectIdx: 7, responsibleId: elisa.id, status: "CANCELED", priority: "LOW", dueInDays: -30, estimatedHours: 6 },
    { title: "Plano de migração de dados", projectIdx: 7, responsibleId: fabio.id, status: "NOT_STARTED", priority: "LOW", dueInDays: -12, estimatedHours: 12 },
    { title: "Relatório semanal de tráfego Nexa", projectIdx: 0, responsibleId: gabi.id, status: "IN_PROGRESS", priority: "LOW", dueInDays: 1, estimatedHours: 2 },
    { title: "Testes E2E do checkout", projectIdx: 1, responsibleId: diego.id, status: "NOT_STARTED", priority: "HIGH", dueInDays: 15, estimatedHours: 12 },
    { title: "Documentação da API pública", projectIdx: 4, responsibleId: elisa.id, status: "NOT_STARTED", priority: "LOW", dueInDays: 25, estimatedHours: 8 },
    { title: "Otimização de criativos (CTR)", projectIdx: 0, responsibleId: gabi.id, status: "IN_PROGRESS", priority: "MEDIUM", dueInDays: 6, estimatedHours: 4 },
    { title: "Revisão de copy das páginas", projectIdx: 0, responsibleId: fabio.id, status: "IN_REVIEW", priority: "MEDIUM", dueInDays: 2, estimatedHours: 3 },
  ];

  const managers: Record<number, string> = {};
  projects.forEach((p, i) => {
    managers[i] = p.managerId ?? admin.id;
  });

  const tasks = [];
  for (let i = 0; i < taskSeeds.length; i++) {
    const t = taskSeeds[i];
    const project = projects[t.projectIdx];
    const isDone = t.status === "DONE";
    const task = await db.task.create({
      data: {
        title: t.title,
        description: t.description ?? `Tarefa do projeto ${project.name}.`,
        projectId: project.id,
        clientId: project.clientId,
        creatorId: managers[t.projectIdx],
        responsibleId: t.responsibleId,
        status: t.status,
        priority: t.priority,
        startDate: daysAgo(Math.max(5, Math.abs(t.dueInDays) + 5)),
        dueDate: t.dueInDays >= 0 ? daysAhead(t.dueInDays) : daysAgo(-t.dueInDays),
        completedAt: isDone ? daysAgo(Math.max(1, -t.dueInDays)) : null,
        estimatedHours: t.estimatedHours,
        blockReason: t.status === "BLOCKED" ? "Aguardando acesso ao banco de dados legado do cliente." : null,
        kanbanOrder: i,
      },
    });
    tasks.push(task);

    await db.activityLog.create({
      data: {
        actorId: managers[t.projectIdx],
        entityType: "TASK",
        entityId: task.id,
        action: "CREATED",
        message: `Tarefa criada: ${task.title}`,
        createdAt: task.startDate ?? task.createdAt,
      },
    });
    if (isDone) {
      await db.activityLog.create({
        data: {
          actorId: t.responsibleId,
          entityType: "TASK",
          entityId: task.id,
          action: "COMPLETED",
          message: "Tarefa concluída",
          createdAt: task.completedAt!,
        },
      });
    }
  }

  // Checklist + comentários + horas em algumas tarefas
  await db.taskChecklistItem.createMany({
    data: [
      { taskId: tasks[5].id, content: "Modelar tabelas de pontos", doneAt: daysAgo(6), position: 0 },
      { taskId: tasks[5].id, content: "Endpoints de ranking", doneAt: null, position: 1 },
      { taskId: tasks[5].id, content: "Badges e conquistas", doneAt: null, position: 2 },
      { taskId: tasks[14].id, content: "Receber credenciais sandbox", doneAt: daysAgo(4), position: 0 },
      { taskId: tasks[14].id, content: "Implementar assinatura de webhook", doneAt: null, position: 1 },
    ],
  });
  await db.taskComment.createMany({
    data: [
      { taskId: tasks[5].id, authorId: gestorAna.id, content: "Prioridade máxima esta semana. Qualquer bloqueio me avisem.", createdAt: daysAgo(3) },
      { taskId: tasks[5].id, authorId: diego.id, content: "Endpoints de pontos prontos, iniciando ranking amanhã.", createdAt: daysAgo(2) },
      { taskId: tasks[6].id, authorId: diego.id, content: "Sem acesso ao banco legado ainda — cliente notificado.", createdAt: daysAgo(4) },
      { taskId: tasks[1].id, authorId: gestorBruno.id, content: "Orçamento diário aprovado pelo cliente.", createdAt: daysAgo(1) },
    ],
  });
  await db.timeEntry.createMany({
    data: [
      { taskId: tasks[5].id, userId: diego.id, hours: 6, workedAt: daysAgo(3), note: "Modelagem e endpoints" },
      { taskId: tasks[5].id, userId: diego.id, hours: 4, workedAt: daysAgo(2) },
      { taskId: tasks[1].id, userId: gabi.id, hours: 3, workedAt: daysAgo(1), note: "Setup de campanhas" },
      { taskId: tasks[8].id, userId: fabio.id, hours: 5, workedAt: daysAgo(2) },
    ],
  });

  // Tags nas tarefas
  await db.taskTag.createMany({
    data: [
      { taskId: tasks[3].id, tagId: tags[0].id },
      { taskId: tasks[3].id, tagId: tags[1].id },
      { taskId: tasks[5].id, tagId: tags[2].id },
      { taskId: tasks[8].id, tagId: tags[3].id },
      { taskId: tasks[14].id, tagId: tags[4].id },
    ],
  });

  // ---------- Solicitações de prazo ----------
  const dr1 = await db.deadlineRequest.create({
    data: {
      taskId: tasks[3].id, // Pixel e eventos — atrasada
      requesterId: gabi.id,
      currentDeadline: tasks[3].dueDate,
      requestedDeadline: daysAhead(4),
      reason: "Dependência do acesso ao Gerenciador de Negócios do cliente, liberado apenas ontem.",
      impact: "Sem impacto no lançamento se aprovado até sexta.",
      plan: "Configurar eventos hoje e validar disparos amanhã.",
      status: "PENDING",
    },
  });
  await db.activityLog.create({
    data: {
      actorId: gabi.id,
      entityType: "TASK",
      entityId: tasks[3].id,
      action: "DEADLINE_REQUEST_CREATED",
      message: "Solicitação de novo prazo criada",
      newValue: JSON.stringify({ requestedDeadline: dr1.requestedDeadline }),
      createdAt: daysAgo(1),
    },
  });
  await db.notification.create({
    data: {
      userId: gestorBruno.id,
      type: "DEADLINE_REQUEST",
      title: "Solicitação de prazo recebida",
      body: `Gabriela solicitou novo prazo para "${tasks[3].title}"`,
      link: `/tarefas/${tasks[3].id}`,
      createdAt: daysAgo(1),
    },
  });

  const dr2 = await db.deadlineRequest.create({
    data: {
      taskId: tasks[6].id, // Migrar base — bloqueada
      requesterId: diego.id,
      currentDeadline: tasks[6].dueDate,
      requestedDeadline: daysAhead(10),
      reason: "Cliente ainda não liberou acesso ao banco legado.",
      impact: "Atrasa integração da área de membros.",
      dependencies: "Acesso VPN do cliente.",
      plan: "Concluir em 3 dias úteis após liberação do acesso.",
      status: "APPROVED",
      reviewerId: gestorAna.id,
      reviewNote: "Aprovado. Cobrar o cliente diariamente sobre o acesso.",
      reviewedAt: daysAgo(2),
    },
  });
  await db.task.update({ where: { id: tasks[6].id }, data: { dueDate: dr2.requestedDeadline } });
  await db.activityLog.createMany({
    data: [
      {
        actorId: diego.id,
        entityType: "TASK",
        entityId: tasks[6].id,
        action: "DEADLINE_REQUEST_CREATED",
        message: "Solicitação de novo prazo criada",
        createdAt: daysAgo(3),
      },
      {
        actorId: gestorAna.id,
        entityType: "TASK",
        entityId: tasks[6].id,
        action: "DEADLINE_REQUEST_APPROVED",
        message: "Solicitação de prazo aprovada",
        oldValue: JSON.stringify({ dueDate: tasks[6].dueDate }),
        newValue: JSON.stringify({ dueDate: dr2.requestedDeadline }),
        createdAt: daysAgo(2),
      },
    ],
  });
  await db.notification.create({
    data: {
      userId: diego.id,
      type: "DEADLINE_APPROVED",
      title: "Solicitação de prazo aprovada",
      body: `Novo prazo aprovado para "${tasks[6].title}"`,
      link: `/tarefas/${tasks[6].id}`,
      createdAt: daysAgo(2),
    },
  });

  // ---------- Receitas (20, espalhadas em ~60 dias) ----------
  const revenueSeeds = [
    { desc: "Mensalidade gestão de tráfego — Nexa", clientIdx: 0, projectIdx: 0, gross: 450000, fee: 13500, daysAgo: 2, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Parcela 2/3 — Portal do aluno", clientIdx: 0, projectIdx: 1, gross: 250000, fee: 7500, daysAgo: 5, status: "PAID", method: "BOLETO", platform: "ASAAS" },
    { desc: "Mensalidade automações — Vitalle", clientIdx: 1, projectIdx: 2, gross: 190000, fee: 5700, daysAgo: 1, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Entrada projeto gateway — TechFin", clientIdx: 2, projectIdx: 4, gross: 400000, fee: 12000, daysAgo: 8, status: "PAID", method: "TRANSFER", platform: "MANUAL" },
    { desc: "Setup campanha — Impulso", clientIdx: 3, projectIdx: 6, gross: 100000, fee: 4900, daysAgo: 3, status: "PAID", method: "CARD", platform: "STRIPE" },
    { desc: "Venda curso interno — afiliação", clientIdx: 0, projectIdx: null, gross: 49700, fee: 4970, daysAgo: 0, status: "PAID", method: "CARD", platform: "HOTMART" },
    { desc: "Mensalidade tráfego — Nexa (mês anterior)", clientIdx: 0, projectIdx: 0, gross: 450000, fee: 13500, daysAgo: 32, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Parcela 1/3 — Portal do aluno", clientIdx: 0, projectIdx: 1, gross: 250000, fee: 7500, daysAgo: 35, status: "PAID", method: "BOLETO", platform: "ASAAS" },
    { desc: "Mensalidade automações — Vitalle (mês anterior)", clientIdx: 1, projectIdx: 2, gross: 190000, fee: 5700, daysAgo: 31, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Site institucional — parcela final", clientIdx: 1, projectIdx: 3, gross: 125000, fee: 3750, daysAgo: 14, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Consultoria pontual de funil", clientIdx: 3, projectIdx: null, gross: 80000, fee: 2400, daysAgo: 6, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Mentoria de tráfego — turma 12", clientIdx: 0, projectIdx: null, gross: 199700, fee: 19970, daysAgo: 11, status: "PAID", method: "CARD", platform: "KIWIFY" },
    { desc: "Parcela migração e-commerce", clientIdx: 4, projectIdx: 7, gross: 275000, fee: 8250, daysAgo: 48, status: "PAID", method: "BOLETO", platform: "ASAAS" },
    { desc: "Parcela em aberto — Sabor da Serra", clientIdx: 4, projectIdx: 7, gross: 275000, fee: 0, daysAgo: 18, status: "PENDING", method: "BOLETO", platform: "ASAAS" },
    { desc: "Upsell relatórios avançados — TechFin", clientIdx: 2, projectIdx: 5, gross: 150000, fee: 4500, daysAgo: 4, status: "PENDING", method: "TRANSFER", platform: "MANUAL" },
    { desc: "Venda workshop automações", clientIdx: 1, projectIdx: null, gross: 29700, fee: 2970, daysAgo: 9, status: "PAID", method: "CARD", platform: "EDUZZ" },
    { desc: "Reembolso workshop (1 aluno)", clientIdx: 1, projectIdx: null, gross: 29700, fee: 0, daysAgo: 7, status: "REFUNDED", method: "CARD", platform: "EDUZZ" },
    { desc: "Mensalidade tráfego — Impulso (proposta)", clientIdx: 3, projectIdx: 6, gross: 200000, fee: 0, daysAgo: 1, status: "PENDING", method: "PIX", platform: "MANUAL" },
    { desc: "Manutenção mensal site — Vitalle", clientIdx: 1, projectIdx: 3, gross: 45000, fee: 1350, daysAgo: 13, status: "PAID", method: "PIX", platform: "MANUAL" },
    { desc: "Parcial acordo inadimplência — Sabor da Serra", clientIdx: 4, projectIdx: 7, gross: 137500, fee: 4125, daysAgo: 22, status: "PARTIALLY_PAID", method: "PIX", platform: "MANUAL" },
  ] as const;

  for (const r of revenueSeeds) {
    await db.revenue.create({
      data: {
        description: r.desc,
        clientId: clients[r.clientIdx].id,
        projectId: r.projectIdx === null ? null : projects[r.projectIdx].id,
        grossCents: r.gross,
        feeCents: r.fee,
        netCents: r.gross - r.fee,
        saleDate: daysAgo(r.daysAgo),
        receiveDate: r.status === "PAID" || r.status === "PARTIALLY_PAID" ? daysAgo(Math.max(0, r.daysAgo - 1)) : null,
        status: r.status,
        paymentMethod: r.method,
        platform: r.platform,
        createdById: admin.id,
      },
    });
  }

  // ---------- Notificações extras ----------
  await db.notification.createMany({
    data: [
      { userId: gabi.id, type: "TASK_ASSIGNED", title: "Nova tarefa atribuída", body: "Estrutura de campanhas Meta Ads", link: `/tarefas/${tasks[20].id}`, createdAt: daysAgo(2) },
      { userId: carla.id, type: "TASK_ASSIGNED", title: "Nova tarefa atribuída", body: "Landing page de matrícula", link: `/tarefas/${tasks[21].id}`, createdAt: daysAgo(2) },
      { userId: diego.id, type: "TASK_DUE_SOON", title: "Tarefa próxima do vencimento", body: "Webhook de conciliação PIX vence em breve", link: `/tarefas/${tasks[14].id}`, createdAt: daysAgo(1) },
      { userId: gabi.id, type: "TASK_OVERDUE", title: "Tarefa vencida", body: "Pixel e eventos de conversão está atrasada", link: `/tarefas/${tasks[3].id}`, createdAt: daysAgo(0) },
      { userId: admin.id, type: "PROJECT_UPDATED", title: "Projeto atualizado", body: "Integração gateway PIX mudou para Em andamento", link: `/projetos/${projects[4].id}`, createdAt: daysAgo(3) },
    ],
  });

  console.log("Seed concluído com sucesso!");
  console.log("Login: admin@darkcode.dev / DarkCode123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
