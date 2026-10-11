import { z } from 'zod'

export const loginSchema = z.object({
  userName: z.string().trim().min(4, 'Enter your user name').max(64),
  password: z.string().min(4, 'Enter your password').max(28),
})

export const cardNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(8, 'Enter at least 8 characters')
    .max(28, 'Max 24 characters'),
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
  .refine((p) => !isWeakPin(p), 'Choose a PIN that is harder to guess')
