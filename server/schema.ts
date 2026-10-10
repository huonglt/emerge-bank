import { z } from 'zod'

// One schema, used by the form (UX) AND the server (the real check).
export const loginSchema = z.object({
  userName: z.string().trim().min(4, 'Enter your user name').max(64),
  password: z.string().min(4, 'Enter your password').max(28),
})
