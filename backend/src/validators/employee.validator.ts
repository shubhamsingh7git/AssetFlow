// ─── Employee Validators ────────────────────────────────────────────────────
import { z } from 'zod';

export const strongPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

export const createEmployeeSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm password'),
  phone: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  roleName: z.string().optional().default('Employee'),
  designation: z.string().optional().nullable(),
  employmentType: z.string().optional().default('full-time'),
  joiningDate: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  forcePasswordChange: z.boolean().optional().default(true),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  roleName: z.string().optional(),
  designation: z.string().optional().nullable(),
  employmentType: z.string().optional(),
  joiningDate: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const resetEmployeePasswordSchema = z.object({
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ResetEmployeePasswordInput = z.infer<typeof resetEmployeePasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
