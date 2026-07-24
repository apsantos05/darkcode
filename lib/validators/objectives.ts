import { z } from "zod";
import { GOAL_STATUS, MISSION_STATUS, PRIORITIES } from "@/lib/constants";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const optionalDate = z.string().optional().transform((v) => v || undefined).refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Data inválida").transform((v) => v ? new Date(v) : undefined);
const numberValue = (label: string, min = 0) => z.string().trim().transform((v) => Number(v.replace(",", "."))).refine((v) => Number.isFinite(v) && v >= min, `${label} inválido`);

export const goalSchema = z.object({
  title: z.string().trim().min(2, "Informe o título").max(160), description: optionalText(3000),
  metric: z.string().trim().min(2, "Informe o indicador").max(120), unit: z.string().trim().min(1, "Informe a unidade").max(40),
  targetValue: numberValue("Valor alvo", 0.01), currentValue: numberValue("Valor atual"),
  status: z.enum(Object.keys(GOAL_STATUS) as [keyof typeof GOAL_STATUS, ...(keyof typeof GOAL_STATUS)[]]),
  ownerId: optionalText(64), startDate: optionalDate, dueDate: optionalDate,
}).refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, { path: ["dueDate"], message: "O prazo deve ser posterior ao início" });

export const missionSchema = z.object({
  title: z.string().trim().min(2, "Informe o título").max(160), description: optionalText(3000),
  priority: z.enum(Object.keys(PRIORITIES) as [keyof typeof PRIORITIES, ...(keyof typeof PRIORITIES)[]]),
  status: z.enum(Object.keys(MISSION_STATUS) as [keyof typeof MISSION_STATUS, ...(keyof typeof MISSION_STATUS)[]]),
  points: z.string().trim().transform(Number).refine((v) => Number.isInteger(v) && v >= 0 && v <= 100000, "Pontos inválidos"),
  assigneeId: optionalText(64), goalId: optionalText(64), startDate: optionalDate, dueDate: optionalDate,
}).refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, { path: ["dueDate"], message: "O prazo deve ser posterior ao início" });
