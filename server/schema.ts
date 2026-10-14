import { z } from 'zod'

export const loginSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(4, 'Username must be at least 4 characters')
    .max(24),
  password: z.string().min(4, 'Password must be at least 4 characters').max(24),
})

export const cardNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(6, 'Card name should be more than 6 characters')
    .max(24, 'Card name should be no more than 24 characters'),
})

// PIN must be 4 digit number
export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
