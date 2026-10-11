import { z } from 'zod'

export const loginSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(4, 'Username must be at least 4 characters')
    .max(64),
  password: z.string().min(4, 'Password must be at least 4 characters').max(28),
})

export const cardNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(6, 'Card name should be more than 6 characters')
    .max(24, 'Card name should be no more than 24 characters'),
})
/**
 * a weak PIN is when it is 4 consecutive numbers
 * For a 4-digit PIN that means 0123, 1234, 2345, 3456, 4567, 5678 and 6789.
 * Or 9876, 8765, 7654, 6543, 5432, 4321 and 3210
 */
export const isWeakPin = (p: string) =>
  /^(\d)\1{3}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p)

// PIN must be 4 digit number, not weak PIN
export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
