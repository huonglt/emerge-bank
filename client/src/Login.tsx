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
    <div className="flex flex-col w-full  items-center justify-center">
      <form
        className="gap-4 m-auto  w-sm p-8 py-12  text-gray-500 rounded-lg shadow-xl border border-gray-200 bg-white text-left"
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
        noValidate
      >
        <p className="text-2xl font-medium m-auto text-center">
          <span className="text-indigo-500">Login</span>
        </p>

        <div className="w-full">
          <p>Username</p>
          <input
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-indigo-500"
            type="text"
            required
            {...form.register('userName')}
          />
          {errors.userName && (
            <div className="mb-4">
              <span role="alert" className="text-red-700 ">
                {errors.userName.message}
              </span>
            </div>
          )}
        </div>
        <div className="w-full mt-6">
          <p>Password</p>
          <input
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-indigo-500"
            type="password"
            required
            {...form.register('password')}
          />

          {errors.password && (
            <div className="mb-4">
              <span role="alert" className="text-red-700 ">
                {errors.password.message}
              </span>
            </div>
          )}
        </div>
        <div className="mt-6">
          {login.error && (
            <div className="mb-4">
              <span role="alert" className="text-red-700 ">
                {login.error.message}
              </span>
            </div>
          )}
          <button
            className="bg-indigo-500 hover:bg-indigo-600 transition-all text-white w-full p-2 mt-1 rounded-md cursor-pointer "
            type="submit"
            disabled={login.isPending}
          >
            Login
          </button>
        </div>
      </form>
    </div>
  )
}
