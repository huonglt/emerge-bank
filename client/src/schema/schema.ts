import { z } from 'zod'

/**
 * login schema for validation
 * user name & password both from 4 to 24 characters
 */
export const loginSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(4, 'User name must be at least 4 characters')
    .max(24, 'User name must be no more than 24 characters'),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(24, 'Password must be no more than 24 characters'),
})

/**
 * card name schema for validation
 * must be from 6 to 24 characters
 */
export const cardNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(6, 'Card name must be at least 6 characters')
    .max(24, 'Card name must be no more than 24 characters'),
})

/**
 * card PIN schema for validation
 * PIN and confirm PIN must each be a 4 digit number, and confirm PIN must match PIN
 * format errors come before the mismatch
 */
export const pinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
    confirmPin: z
      .string()
      .regex(/^\d{4}$/, 'Confirm PIN must be exactly 4 digits'),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'PINs do not match',
    path: ['confirmPin'],
  })
