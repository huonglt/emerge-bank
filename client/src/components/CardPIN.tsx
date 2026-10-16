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
import { CardMedia } from './CardMedia'
import { useRef, useState } from 'react'
import { encryptPin } from '@/lib/utils'
import { Input } from './ui/input'
import { pinSchema } from '@/schema/schema'

type CardPIN = { pin: string }

export const CardPIN = () => {
  const qc = useQueryClient()
  /**
   * The PIN lives only in uncontrolled inputs: never in React state, or the query cache, or browser storage
   * It is read at submit time and cleared straight away.
   */
  const pinRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const setCardPIN = useMutation({
    mutationFn: async (v: { pin: string; confirm: string }) =>
      api('/card/pin', {
        method: 'PUT',
        /**
         * encryp the pin & confirm pin using server s public key (RSA-OAEP) and a single-use nonce
         */
        body: { encrypted: await encryptPin(v.pin, v.confirm) },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  })

  const handleFormSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const pin = pinRef.current!.value
    const confirm = confirmRef.current!.value
    const parsed = pinSchema.safeParse(pin)
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    if (pin !== confirm) return setError('PINs do not match')
    setError(null)
    setCardPIN.mutate({ pin, confirm })
    /**
     * clear the PIN and confirm PIN after submit
     */
    pinRef.current!.value = ''
    confirmRef.current!.value = ''
  }
  const errMessage = error ?? setCardPIN.error?.message

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleFormSubmit} noValidate autoComplete="off">
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
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="pin">PIN</Label>

              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                ref={pinRef}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmedPin">Confirmed PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                ref={confirmRef}
              />
            </div>
          </div>
          <div className="gid pb-2 pt-2 text-left">
            {errMessage && (
              <span role="alert" className="text-red-700 ">
                {errMessage}
              </span>
            )}
          </div>
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
