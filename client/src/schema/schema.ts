import { isWeakPin } from '@/lib/utils'
import { z } from 'zod'
export const loginSchema = z.object({
  userName: z.string().trim().min(4, 'Enter your user name').max(24),
  password: z.string().min(4, 'Enter your password').max(24),
})

export const cardNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(6, 'Card name should be more than 6 characters')
    .max(24, 'Card name should be no more than 24 characters'),
})

// PIN must be 4 digit number, not weak PIN
export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
  .refine((p) => !isWeakPin(p), 'Choose a PIN that is harder to guess')
