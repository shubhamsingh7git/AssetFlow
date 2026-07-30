// ─── Auth Validators ────────────────────────────────────────────────────────
import { z } from 'zod';
import { strongPasswordSchema } from './employee.validator';

export const adminRegisterSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
