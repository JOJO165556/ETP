import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  last_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Z]/, "Doit contenir au moins une majuscule.")
    .regex(/[a-z]/, "Doit contenir au moins une minuscule.")
    .regex(/[0-9]/, "Doit contenir au moins un chiffre."),
});

export type RegisterValues = z.infer<typeof registerSchema>;
