import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api, setCsrf } from './api'
import type { Me } from './types'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
type LoginInput = { userName: string; password: string }
export const loginSchema = z.object({
  userName: z.string().trim().min(1, 'Enter your username').max(64),
  password: z.string().min(1, 'Enter your password').max(128),
})

export const Login = () => {
  const qc = useQueryClient()
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const login = useMutation({
    mutationFn: (v: LoginInput) =>
      api<Me>('/login', { method: 'POST', body: v }),
    onSuccess: (m) => {
      setCsrf(m.csrfToken)
      qc.setQueryData(['me'], m.user)
    },
  })
  const { errors } = form.formState

  return (
    <form onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
      <h1>Login</h1>

      <label>
        Username
        <input autoComplete="username" {...form.register('userName')} />
        {errors.userName && <span role="alert">{errors.userName.message}</span>}
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        {errors.password && <span role="alert">{errors.password.message}</span>}
      </label>
      {login.error && <p role="alert">{login.error.message}</p>}
      <button disabled={login.isPending}>Sign in</button>
    </form>
  )
}
