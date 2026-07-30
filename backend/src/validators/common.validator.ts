// ─── Common Validators ──────────────────────────────────────────────────────
import { z } from 'zod';

// ─── User Validators ────────────────────────────────────────────────────────
export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  departmentId: z.string().optional().nullable(),
  avatar: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().optional(),
  roleName: z.string().optional(),
}).refine(data => data.roleId || data.roleName, {
  message: 'Either roleId or roleName must be provided',
});

// ─── Department Validators ──────────────────────────────────────────────────
export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(100),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ─── Category Validators ───────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  iconName: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  customFields: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['Text', 'Number', 'Date', 'Dropdown']),
    required: z.boolean().default(false),
  })).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── Asset Validators ──────────────────────────────────────────────────────
// ─── Asset Validators ──────────────────────────────────────────────────────
export const createAssetSchema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  tag: z.string().min(1, 'Asset code is required').optional(),
  assetCode: z.string().optional(),
  categoryId: z.string().min(1, 'Asset category is required'),
  departmentId: z.string().min(1, 'Department is required').optional().nullable(),
  purchaseDate: z.string().min(1, 'Purchase date is required').optional().nullable(),
  status: z.enum(['AVAILABLE', 'ALLOCATED', 'RESERVED', 'MAINTENANCE', 'LOST', 'DISPOSED', 'RETIRED']).default('AVAILABLE'),
  
  // Optional fields
  type: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  qrCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  poNumber: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  purchaseCost: z.number().or(z.string().transform(v => parseFloat(v))).optional().nullable(),
  currentValue: z.number().or(z.string().transform(v => parseFloat(v))).optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  expectedLifeMonths: z.number().or(z.string().transform(v => parseInt(v, 10))).optional().nullable(),
  depreciationMethod: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  storageLocation: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAssetSchema = createAssetSchema.partial();

// ─── Allocation Validators ─────────────────────────────────────────────────
export const createAllocationSchema = z.object({
  assetId: z.string().min(1),
  userId: z.string().min(1),
});

export const returnAllocationSchema = z.object({
  condition: z.string().optional(),
});

// ─── Transfer Validators ───────────────────────────────────────────────────
export const createTransferSchema = z.object({
  assetId: z.string().min(1),
  toUserId: z.string().min(1),
  reason: z.string().optional(),
});

// ─── Booking Validators ────────────────────────────────────────────────────
export const createBookingSchema = z.object({
  resourceName: z.string().min(1),
  resourceType: z.string().default('room'),
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  notes: z.string().optional(),
  assetId: z.string().optional(),
});

// ─── Maintenance Validators ────────────────────────────────────────────────
export const createMaintenanceSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  issue: z.string().min(1, 'Issue description is required'),
  notes: z.string().optional().nullable(),
});

export const advanceMaintenanceSchema = z.object({
  technicianName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateMaintenanceStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'], {
    errorMap: () => ({ message: 'Invalid maintenance status. Must be one of PENDING, APPROVED, TECHNICIAN_ASSIGNED, IN_PROGRESS, RESOLVED' }),
  }),
  technicianName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Audit Validators ──────────────────────────────────────────────────────
export const createAuditSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  assetIds: z.array(z.string()).optional(),
  auditorIds: z.array(z.string()).optional(),
});

export const updateAuditItemSchema = z.object({
  status: z.enum(['VERIFIED', 'MISSING', 'DAMAGED']),
});
