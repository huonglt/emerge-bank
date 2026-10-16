import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

import { Label } from '@/components/ui/label'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'

import { useQueryClient, useMutation } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { CardMedia } from '@/components/CardMedia'
import { ErrorMessage } from '@/components/ErrorMessage'

import { encryptPin } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { pinSchema } from '@/schema/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

type CardPIN = { pin: string; confirmPin: string }

export const CardPIN = () => {
  /**
   * react-hook-form keeps inputs uncontrolled
   * so the PIN is never put in React state
   */
  const form = useForm<CardPIN>({ resolver: zodResolver(pinSchema) })
  const qc = useQueryClient()

  const setCardPIN = useMutation({
    mutationFn: async (v: CardPIN) =>
      api('/card/pin', {
        method: 'PUT',
        /**
         * encryp the pin & confirm pin using server s public key (RSA-OAEP) and a single-use nonce
         */
        body: { encrypted: await encryptPin(v.pin, v.confirmPin) },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  })
  const { errors } = form.formState

  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={form.handleSubmit((v) => {
          setCardPIN.mutate(v)
          // clear the PIN straight away: from the inputs and the form'
          form.reset({ pin: '', confirmPin: '' })
        })}
        noValidate
        autoComplete="off"
      >
        <CardHeader>
          <Item className="pr-0 pl-0">
            <CardMedia />
            <ItemContent>
              <ItemTitle>Setting up your virtual bank card</ItemTitle>
              <ItemDescription>
                We need a PIN for your virtual card
              </ItemDescription>
            </ItemContent>
          </Item>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                {...form.register('pin')}
                aria-invalid={!!errors.pin}
              />
              <ErrorMessage message={errors.pin?.message} />
            </div>
            <div className="grid gap-2 pb-4">
              <Label htmlFor="confirmPin">Confirmed PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                {...form.register('confirmPin')}
                aria-invalid={!!errors.confirmPin}
              />
              <ErrorMessage message={errors.confirmPin?.message} />
            </div>
          </div>

          <ErrorMessage message={setCardPIN.error?.message} className="pb-2" />
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={setCardPIN.isPending}
          >
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
