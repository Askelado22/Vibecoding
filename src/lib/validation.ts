import { MoveStatus } from '@prisma/client';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const updateItemSchema = z.object({
  finalBreadcrumbs: z
    .string()
    .min(5)
    .regex(/.+>.+/, 'Путь должен содержать минимум два уровня через >')
    .optional()
    .nullable(),
  moveStatus: z.nativeEnum(MoveStatus).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  updatedAt: z.string().optional()
});

export const completeItemSchema = z.object({
  confirm: z.boolean()
});

export const suggestionUploadSchema = z.object({
  entries: z.array(
    z.object({
      path: z.string().min(3),
      score: z.number().optional(),
      titleMatch: z.string().min(1),
      description: z.string().optional()
    })
  )
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25)
});
