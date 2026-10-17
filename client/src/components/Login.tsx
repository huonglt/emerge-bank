import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api, setAccessToken, setCsrfToken } from '@/lib/api'
import { zodResolver } from '@hookform/resolvers/zod'

import type { Me } from '@/types'
import { loginSchema } from '@/schema/schema'
import { Item, ItemContent, ItemTitle } from '@/components/ui/item'
import { UserMedia } from '@/components/UserMedia'
import { ErrorMessage } from '@/components/ErrorMessage'

type LoginInput = { userName: string; password: string }

export const LogIn = () => {
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const qc = useQueryClient()
  const login = useMutation({
    mutationFn: async (formData: LoginInput) => {
      try {
        return await api<Me>('/login', { method: 'POST', body: formData })
      } finally {
        // clear the plain password right after submission
        formData.password = ''
      }
    },
    onSuccess: async (m) => {
      setAccessToken(m.accessToken)
      setCsrfToken(m.csrfToken)
      // a /me request still in flight from before login must not overwrite the new user
      await qc.cancelQueries({ queryKey: ['user'] })
      qc.setQueryData(['user'], m.user)
    },
  })

  /**
   *  submit form
   * call /login api
   * clear the plain password right after submission
   */
  const onSubmit = (formData: LoginInput) => {
    login.mutate(formData)
    form.resetField('password')
  }

  const { errors } = form.formState

  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
          <div className="flex flex-col gap-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                type="text"
                required
                {...form.register('userName')}
                aria-invalid={!!errors.userName || !!login.error}
              />
              <ErrorMessage message={errors.userName?.message} />
            </div>

            <div className="grid gap-2 pb-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                {...form.register('password')}
                aria-invalid={!!errors.password || !!login.error}
              />
              <ErrorMessage message={errors.password?.message} />
            </div>
          </div>
          <ErrorMessage message={login.error?.message} className="pb-2" />
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button className="w-full" type="submit" disabled={login.isPending}>
            Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
