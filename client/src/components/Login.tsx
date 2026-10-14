import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api, setAccessToken, setCsrf } from '@/lib/api'
import { zodResolver } from '@hookform/resolvers/zod'

import type { Me } from '@/types'
import { loginSchema } from '@/schema/schema'
import { Item, ItemContent, ItemTitle } from './ui/item'
import { UserMedia } from './UserMedia'

type LoginInput = { userName: string; password: string }

export const LogIn = () => {
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const qc = useQueryClient()
  const login = useMutation({
    mutationFn: (v: LoginInput) =>
      api<Me>('/login', { method: 'POST', body: v }),
    onSuccess: (m) => {
      setAccessToken(m.accessToken)
      setCsrf(m.csrfToken)
      qc.setQueryData(['user'], m.user)
    },
  })
  const { errors } = form.formState

  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={form.handleSubmit((v) => login.mutate(v))}
        noValidate
        autoComplete="off"
      >
        <CardHeader>
          <Item className="pr-0 pl-0">
            <UserMedia />
            <ItemContent>
              <ItemTitle>Login to your account</ItemTitle>
            </ItemContent>
          </Item>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="grid gap-2">
              <Label htmlFor="userName">Name</Label>
              <Input type="text" required {...form.register('userName')} />
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

              <Input type="password" required {...form.register('password')} />
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
          <Button
            className="w-full"
            type="submit"
            disabled={login.isPending}
          >
            Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
