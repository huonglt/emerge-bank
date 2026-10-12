import { z } from 'zod'

/**
 * login shema for validation
 * name & password both from 4 to 24 characters
 */
export const loginSchema = z.object({
  userName: z.string().trim().min(4, 'Enter your user name').max(24),
  password: z.string().min(4, 'Enter your password').max(24),
})

/**
 * card name shema for validation
 * must be from 6 to 24 characters
 */
export const cardNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(6, 'Card name should be more than 6 characters')
    .max(24, 'Card name should be no more than 24 characters'),
})

/**
 * card PIN shema for validation
 * must be 4 digit number
 */
export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
