// ─── Organization Validators ────────────────────────────────────────────────
import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  logo: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const updateOnboardingStatusSchema = z.object({
  step: z.enum(['ORGANIZATION', 'DEPARTMENTS', 'EMPLOYEES', 'ASSETS', 'COMPLETED']),
  completed: z.boolean().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateOnboardingStatusInput = z.infer<typeof updateOnboardingStatusSchema>;
