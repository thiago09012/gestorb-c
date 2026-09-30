import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do cliente.'),
  company_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().trim().optional().nullable().refine(
    (v) => !v || v === '' || /.+@.+\..+/.test(v),
    'Informe um e-mail válido.',
  ),
  city: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'onboarding', 'paused', 'closed']),
  next_contact_at: z.string().optional().nullable(),
  service_ids: z.array(z.string()).default([]),
});

export type ClientSchema = z.infer<typeof clientSchema>;
