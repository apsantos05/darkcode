import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra")
  .regex(/[0-9]/, "A senha deve conter ao menos um número");

export const usernameSchema = z
  .string()
  .min(3, "O nome de usuário deve ter no mínimo 3 caracteres")
  .max(30, "O nome de usuário deve ter no máximo 30 caracteres")
  .regex(/^[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen e underline");

export const loginSchema = z.object({
  identifier: z.string().min(1, "Informe seu e-mail ou nome de usuário"),
  password: z.string().min(1, "Informe sua senha"),
});

export const signupSchema = z
  .object({
    fullName: z.string().min(3, "Informe seu nome completo").max(120),
    username: usernameSchema,
    email: z.string().email("E-mail inválido"),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      error: "É necessário aceitar os termos internos",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
