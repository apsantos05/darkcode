import { z } from "zod";
import {
  PRIORITIES,
  TASK_STATUS,
  type Priority,
  type TaskStatus,
} from "@/lib/constants";

const taskStatusValues = Object.keys(TASK_STATUS) as [TaskStatus, ...TaskStatus[]];
const priorityValues = Object.keys(PRIORITIES) as [Priority, ...Priority[]];

export const taskStatusSchema = z.enum(taskStatusValues);
export const prioritySchema = z.enum(priorityValues);

/** Texto opcional de formulário: string vazia vira undefined. */
function optionalText(max: number, label = "O campo") {
  return z
    .string()
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined));
}

/** Data opcional vinda de input date/datetime-local. */
const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined))
  .refine((v) => v === undefined || !Number.isNaN(new Date(v).getTime()), {
    message: "Data inválida",
  })
  .transform((v) => (v === undefined ? undefined : new Date(v)));

/** Data obrigatória e futura (solicitações de prazo). */
function requiredFutureDate(label: string) {
  return z
    .string()
    .min(1, `Informe ${label}`)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Data inválida" })
    .transform((v) => new Date(v))
    .refine((d) => d.getTime() > Date.now(), {
      message: "A data deve ser futura",
    });
}

/** Número opcional aceitando vírgula decimal pt-BR. */
const optionalHours = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim().replace(",", ".") : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Number(v)), {
    message: "Informe um número válido",
  })
  .transform((v) => (v === undefined ? undefined : Number(v)))
  .refine((v) => v === undefined || (v > 0 && v <= 10000), {
    message: "Horas estimadas devem ser maiores que zero",
  });

// ---------------------------------------------------------------------------
// Criação / edição de tarefa
// ---------------------------------------------------------------------------

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "O título deve ter no mínimo 2 caracteres")
      .max(200, "O título deve ter no máximo 200 caracteres"),
    description: optionalText(10000, "A descrição"),
    projectId: optionalText(64),
    responsibleId: optionalText(64),
    participantIds: z.array(z.string()).default([]),
    priority: prioritySchema.default("MEDIUM"),
    status: taskStatusSchema.default("NOT_STARTED"),
    startDate: optionalDate,
    dueDate: optionalDate,
    estimatedHours: optionalHours,
    tagNames: optionalText(500, "As tags"),
    dependsOnId: optionalText(64),
    blockReason: optionalText(1000, "O motivo do bloqueio"),
  })
  .superRefine((data, ctx) => {
    if (data.status === "BLOCKED" && !data.blockReason) {
      ctx.addIssue({
        code: "custom",
        path: ["blockReason"],
        message: "Informe o motivo do bloqueio",
      });
    }
    if (data.startDate && data.dueDate && data.dueDate.getTime() < data.startDate.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "O prazo deve ser posterior à data de início",
      });
    }
  });

export type TaskFormInput = z.infer<typeof taskFormSchema>;

// ---------------------------------------------------------------------------
// Comentário
// ---------------------------------------------------------------------------

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Escreva um comentário")
    .max(4000, "O comentário deve ter no máximo 4000 caracteres"),
});

// ---------------------------------------------------------------------------
// Item de checklist
// ---------------------------------------------------------------------------

export const checklistItemSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Descreva o item")
    .max(500, "O item deve ter no máximo 500 caracteres"),
});

// ---------------------------------------------------------------------------
// Lançamento de horas
// ---------------------------------------------------------------------------

export const timeEntrySchema = z.object({
  hours: z
    .string()
    .min(1, "Informe as horas trabalhadas")
    .transform((v) => v.trim().replace(",", "."))
    .refine((v) => !Number.isNaN(Number(v)), { message: "Informe um número válido" })
    .transform((v) => Number(v))
    .refine((v) => v > 0, { message: "As horas devem ser maiores que zero" })
    .refine((v) => v <= 24, { message: "Máximo de 24 horas por lançamento" }),
  note: optionalText(500, "A observação"),
  workedAt: optionalDate,
});

// ---------------------------------------------------------------------------
// Solicitação de novo prazo
// ---------------------------------------------------------------------------

export const deadlineRequestSchema = z.object({
  requestedDeadline: requiredFutureDate("o novo prazo"),
  reason: z
    .string()
    .trim()
    .min(10, "Descreva o motivo com pelo menos 10 caracteres")
    .max(2000, "O motivo deve ter no máximo 2000 caracteres"),
  impact: optionalText(2000, "O impacto"),
  dependencies: optionalText(2000, "As dependências"),
  plan: optionalText(2000, "O plano"),
  notes: optionalText(2000, "As observações"),
});

export type DeadlineRequestInput = z.infer<typeof deadlineRequestSchema>;

// ---------------------------------------------------------------------------
// Revisão de solicitação de prazo (gestor)
// ---------------------------------------------------------------------------

export const deadlineReviewSchema = z
  .object({
    decision: z.enum(["approve", "reject", "counter"]),
    reviewNote: optionalText(2000, "A justificativa"),
    counterDeadline: optionalDate,
  })
  .superRefine((data, ctx) => {
    if ((data.decision === "reject" || data.decision === "counter") && !data.reviewNote) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewNote"],
        message:
          data.decision === "reject"
            ? "Informe a justificativa da recusa"
            : "Informe uma nota para a contraproposta",
      });
    }
    if (data.decision === "counter") {
      if (!data.counterDeadline) {
        ctx.addIssue({
          code: "custom",
          path: ["counterDeadline"],
          message: "Informe a data da contraproposta",
        });
      } else if (data.counterDeadline.getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["counterDeadline"],
          message: "A contraproposta deve ser uma data futura",
        });
      }
    }
  });

export type DeadlineReviewInput = z.infer<typeof deadlineReviewSchema>;
