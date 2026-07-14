import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  Globe,
  IdCard,
  LinkIcon,
  Mail,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Tag,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import {
  CLIENT_STATUS,
  PROJECT_STATUS,
  REVENUE_STATUS,
  TASK_STATUS,
  type ClientStatus,
  type ProjectStatus,
  type RevenueStatus,
  type TaskStatus,
} from "@/lib/constants";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import {
  Badge,
  CLIENT_STATUS_TONE,
  PROJECT_STATUS_TONE,
  REVENUE_STATUS_TONE,
  TASK_STATUS_TONE,
} from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ArchiveClientButton } from "./archive-button";

/** Converte o JSON string de links em um array seguro de URLs. */
function parseLinks(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Monta o link wa.me a partir do número livre (prefixa DDI 55 quando ausente). */
function waLink(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  );
}

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user.role, "clients.view")) redirect("/dashboard");

  const { id } = await params;

  const client = await db.client.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, avatarUrl: true } },
      projects: {
        where: { archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, name: true, status: true, dueDate: true },
      },
      tasks: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          responsible: { select: { fullName: true, avatarUrl: true } },
        },
      },
      revenues: {
        where: { deletedAt: null },
        orderBy: { saleDate: "desc" },
        select: {
          id: true,
          description: true,
          netCents: true,
          saleDate: true,
          status: true,
        },
      },
    },
  });

  if (!client) notFound();

  const activities = await db.activityLog.findMany({
    where: { entityType: "CLIENT", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { fullName: true, avatarUrl: true } } },
  });

  const canEdit = hasPermission(user.role, "clients.edit");
  const canArchive = hasPermission(user.role, "clients.archive");
  const canViewFinance = hasPermission(user.role, "finance.view");
  const links = parseLinks(client.links);
  const totalNetCents = client.revenues.reduce((sum, revenue) => sum + revenue.netCents, 0);

  return (
    <div className="animate-fade-in space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/clientes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Clientes
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{client.legalName}</h1>
            <Badge tone={CLIENT_STATUS_TONE[client.status] ?? "neutral"}>
              {CLIENT_STATUS[client.status as ClientStatus] ?? client.status}
            </Badge>
            {client.archivedAt && <Badge tone="warning">Arquivado</Badge>}
          </div>
          {client.tradeName && <p className="mt-1 text-sm text-muted">{client.tradeName}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Link
              href={`/clientes/${client.id}/editar`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Editar
            </Link>
          )}
          {canArchive && (
            <ArchiveClientButton
              clientId={client.id}
              clientName={client.legalName}
              archived={Boolean(client.archivedAt)}
            />
          )}
        </div>
      </div>

      {/* Dados de contato, comerciais e observações */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={UserIcon} label="Contato">
              {client.contactName ?? <span className="text-muted">—</span>}
            </InfoRow>
            <InfoRow icon={Mail} label="E-mail">
              {client.email ? (
                <a href={`mailto:${client.email}`} className="text-neon hover:underline">
                  {client.email}
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
            <InfoRow icon={Phone} label="Telefone">
              {client.phone ? (
                <a href={`tel:${client.phone.replace(/\D/g, "")}`} className="hover:underline">
                  {client.phone}
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
            <InfoRow icon={MessageCircle} label="WhatsApp">
              {client.whatsapp ? (
                <a
                  href={waLink(client.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon hover:underline"
                >
                  {client.whatsapp}
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
            <InfoRow icon={Globe} label="Site">
              {client.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon hover:underline"
                >
                  {client.website}
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Wallet} label="Valor do contrato">
              <span className="font-medium">{formatBRL(client.contractCents)}</span>
            </InfoRow>
            <InfoRow icon={Calendar} label="Data de entrada">
              {formatDate(client.startDate)}
            </InfoRow>
            <InfoRow icon={Briefcase} label="Responsável interno">
              {client.owner ? (
                <span className="flex items-center gap-2">
                  <Avatar name={client.owner.fullName} src={client.owner.avatarUrl} size="sm" />
                  {client.owner.fullName}
                </span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
            <InfoRow icon={Tag} label="Segmento">
              {client.segment ?? <span className="text-muted">—</span>}
            </InfoRow>
            <InfoRow icon={Package} label="Produto/Serviço">
              {client.product ?? <span className="text-muted">—</span>}
            </InfoRow>
            <InfoRow icon={IdCard} label="CPF/CNPJ">
              {client.document ?? <span className="text-muted">—</span>}
            </InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações e links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={FileText} label="Observações">
              {client.notes ? (
                <p className="whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
            <InfoRow icon={LinkIcon} label="Links">
              {links.length > 0 ? (
                <ul className="space-y-1">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-neon hover:underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted">—</span>
              )}
            </InfoRow>
          </CardContent>
        </Card>
      </div>

      {/* Projetos e tarefas relacionados */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projetos relacionados</CardTitle>
          </CardHeader>
          <CardContent>
            {client.projects.length === 0 ? (
              <p className="text-sm text-muted">Nenhum projeto vinculado a este cliente.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Nome</TH>
                    <TH>Status</TH>
                    <TH>Prazo</TH>
                  </TR>
                </THead>
                <TBody>
                  {client.projects.map((project) => (
                    <TR key={project.id}>
                      <TD>
                        <Link
                          href={`/projetos/${project.id}`}
                          className="font-medium transition-colors hover:text-neon"
                        >
                          {project.name}
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone={PROJECT_STATUS_TONE[project.status] ?? "neutral"}>
                          {PROJECT_STATUS[project.status as ProjectStatus] ?? project.status}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(project.dueDate)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas relacionadas</CardTitle>
          </CardHeader>
          <CardContent>
            {client.tasks.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma tarefa vinculada a este cliente.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Título</TH>
                    <TH>Status</TH>
                    <TH>Responsável</TH>
                    <TH>Prazo</TH>
                  </TR>
                </THead>
                <TBody>
                  {client.tasks.map((task) => (
                    <TR key={task.id}>
                      <TD>
                        <Link
                          href={`/tarefas/${task.id}`}
                          className="font-medium transition-colors hover:text-neon"
                        >
                          {task.title}
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
                          {TASK_STATUS[task.status as TaskStatus] ?? task.status}
                        </Badge>
                      </TD>
                      <TD>
                        {task.responsible ? (
                          <span className="flex items-center gap-2">
                            <Avatar
                              name={task.responsible.fullName}
                              src={task.responsible.avatarUrl}
                              size="sm"
                            />
                            <span className="text-sm">{task.responsible.fullName}</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(task.dueDate)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Faturamento */}
      {canViewFinance && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Faturamento</CardTitle>
            <p className="text-sm text-muted">
              Total líquido:{" "}
              <span className="font-semibold text-foreground">{formatBRL(totalNetCents)}</span>
            </p>
          </CardHeader>
          <CardContent>
            {client.revenues.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma receita registrada para este cliente.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Descrição</TH>
                    <TH>Valor líquido</TH>
                    <TH>Data</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {client.revenues.map((revenue) => (
                    <TR key={revenue.id}>
                      <TD className="font-medium">{revenue.description}</TD>
                      <TD className="whitespace-nowrap">{formatBRL(revenue.netCents)}</TD>
                      <TD className="whitespace-nowrap">{formatDate(revenue.saleDate)}</TD>
                      <TD>
                        <Badge tone={REVENUE_STATUS_TONE[revenue.status] ?? "neutral"}>
                          {REVENUE_STATUS[revenue.status as RevenueStatus] ?? revenue.status}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de atividades */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma atividade registrada.</p>
          ) : (
            <ul className="space-y-4">
              {activities.map((activity) => (
                <li key={activity.id} className="flex items-start gap-3">
                  <Avatar
                    name={activity.actor?.fullName ?? "Sistema"}
                    src={activity.actor?.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.actor?.fullName ?? "Sistema"}</span>{" "}
                      <span className="text-muted">{activity.message ?? activity.action}</span>
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(activity.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
