import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { CardMedia } from '@/components/CardMedia'
import { ErrorMessage } from '@/components/ErrorMessage'
import { cardNameSchema } from '@/schema/schema'

type CardName = { name: string }

export const CardName = () => {
  const form = useForm<CardName>({ resolver: zodResolver(cardNameSchema) })
  const qc = useQueryClient()

  const setCardName = useMutation({
    mutationFn: (v: CardName) => {
      return api('/card/name', { method: 'PUT', body: v })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  })
  const { errors } = form.formState

  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={form.handleSubmit((v) => setCardName.mutate(v))}
        noValidate
        autoComplete="off"
      >
        <CardHeader>
          <Item className="pr-0 pl-0">
            <CardMedia />
            <ItemContent className="text-left">
              <ItemTitle>Setting up your virtual bank card</ItemTitle>
              <ItemDescription>
                We need a name for your virtual card
              </ItemDescription>
            </ItemContent>
          </Item>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 pt-2">
            <div className="grid gap-2 pb-4">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                required
                {...form.register('name')}
                aria-invalid={!!errors.name}
              />
              <ErrorMessage message={errors.name?.message} />
            </div>
          </div>
          <ErrorMessage message={setCardName.error?.message} className="pb-2" />
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={setCardName.isPending}
          >
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
