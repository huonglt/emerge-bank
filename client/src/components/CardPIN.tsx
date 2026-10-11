import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

import { Label } from '@/components/ui/label'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { z } from 'zod'
import { useQueryClient, useMutation } from '@tanstack/react-query'

import { api } from '../lib/api'
import { BankCard } from './BankCard'
import { useRef, useState } from 'react'
import { encryptPin } from '@/lib/utils'
import { Input } from './ui/input'

type CardPIN = { pin: string }

/**
 * a weak PIN is when it is 4 consecutive numbers
 * For a 4-digit PIN that means 0123, 1234, 2345, 3456, 4567, 5678 and 6789.
 * Or 9876, 8765, 7654, 6543, 5432, 4321 and 3210
 */
export const isWeakPin = (p: string) =>
  /^(\d)\1{3}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p)

// PIN must be 4 digit number, not weak PIN
export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
  .refine((p) => !isWeakPin(p), 'Choose a PIN that is harder to guess')

export const CardPIN = () => {
  const qc = useQueryClient()
  // The PIN lives only in uncontrolled inputs: never in React state, the query cache,
  // a form library, the URL or storage. It is read at submit time and cleared straight away.
  const pinRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const setCardPIN = useMutation({
    mutationFn: async (v: { pin: string; confirm: string }) =>
      api('/card/pin', {
        method: 'PUT',
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
    pinRef.current!.value = ''
    confirmRef.current!.value = ''
  }
  const errMessage = error ?? setCardPIN.error?.message

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleFormSubmit} noValidate>
        <CardHeader>
          <Item className="pr-0 pl-0">
            <BankCard />
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
