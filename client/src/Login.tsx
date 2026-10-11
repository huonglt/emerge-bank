import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api, setAccessToken, setCsrf } from './api'
import type { Me } from './types'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type LoginInput = { userName: string; password: string }
export const loginSchema = z.object({
  userName: z.string().trim().min(4, 'Enter your user name').max(64),
  password: z.string().min(4, 'Enter your password').max(128),
})

export const LogIn = () => {
  const qc = useQueryClient()
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const login = useMutation({
    mutationFn: (v: LoginInput) =>
      api<Me>('/login', { method: 'POST', body: v }),
    onSuccess: (m) => {
      setAccessToken(m.accessToken)
      setCsrf(m.csrfToken)
      qc.invalidateQueries({ queryKey: ['user'] })
    },
  })
  const { errors } = form.formState
  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="grid gap-2">
              <Label htmlFor="userName">Name</Label>
              <Input
                type="text"
                required
                value="helen"
                {...form.register('userName')}
              />
            </div>
            <div className="gid pb-2 text-left">
              {errors.userName && (
                <span role="alert" className="text-red-700 ">
                  {errors.userName.message}
                </span>
              )}
            </div>
            <div className="grid gap-2 pb-2">
              <Label htmlFor="password">Password</Label>

              <Input
                type="password"
                required
                value={'helen123'}
                {...form.register('password')}
              />
              {errors.password && (
                <div className="gid pb-2 text-left">
                  <span role="alert" className="text-red-700 ">
                    {errors.password.message}
                  </span>
                </div>
              )}
            </div>
          </div>
          {login.error && (
            <div className="grid gap-2 pb-2">
              <div className="gid pb-2 text-left">
                <span role="alert" className="text-red-700 ">
                  {login.error.message}
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button className="w-full" type="submit">
            Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
