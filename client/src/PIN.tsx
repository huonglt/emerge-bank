'use client'

import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp'

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

type Props = {
  ref: React.RefObject<any>
}
export const PIN = (props: Props) => {
  const ref = props.ref
  const slotCn = 'h-9 w-9'
  return (
    <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS} ref={ref}>
      <InputOTPGroup>
        <InputOTPSlot index={0} className={slotCn} />
        <InputOTPSlot index={1} className={slotCn} />
        <InputOTPSlot index={2} className={slotCn} />
        <InputOTPSlot index={3} className={slotCn} />
      </InputOTPGroup>
    </InputOTP>
  )
}
