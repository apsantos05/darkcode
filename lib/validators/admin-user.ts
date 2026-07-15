import { z } from "zod";
import { AREAS, USER_ROLES, USER_STATUS } from "@/lib/constants";

const roles = Object.keys(USER_ROLES) as [keyof typeof USER_ROLES, ...(keyof typeof USER_ROLES)[]];
const statuses = Object.keys(USER_STATUS) as [keyof typeof USER_STATUS, ...(keyof typeof USER_STATUS)[]];

const username = z.string().trim().min(3, "Use pelo menos 3 caracteres").max(60, "Use no máximo 60 caracteres").regex(/^[a-zA-Z0-9@._-]+$/, "Use apenas letras, números, @, ponto, hífen ou _");

export const createAdminUserSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo").max(120),
  username,
  email: z.string().trim().email("Informe um e-mail válido").max(160),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(128),
  position: z.string().trim().max(100).optional().transform((v) => v || undefined),
  area: z.enum(AREAS).or(z.literal("")).transform((v) => v || undefined),
  role: z.enum(roles),
  status: z.enum(statuses),
});

export const updateAdminUserSchema = createAdminUserSchema.extend({
  password: z.string().max(128).optional().transform((v) => v?.trim() || undefined).refine((v) => !v || v.length >= 8, "A senha deve ter pelo menos 8 caracteres"),
});
