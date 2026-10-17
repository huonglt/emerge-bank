import { Item, ItemContent, ItemHeader } from '@/components/ui/item'

import type { User } from '@/types'
import { Wifi } from 'lucide-react'

type Props = {
  user: User
}
export const Card = (props: Props) => {
  const {
    card: { maskedCardNumber, name },
  } = props.user

  return (
    <Item variant={'outline'}>
      <ItemHeader className="font-semibold">Your card</ItemHeader>
      <ItemContent>
        {/* a real card's shape (85.6 x 54 mm), no wider than max-w-sm */}
        <section
          aria-label="Virtual card"
          className="flex aspect-[1.586/1] w-full max-w-sm flex-col justify-between rounded-xl bg-gradient-to-br from-brand to-blue-700 p-4 text-white shadow-lg sm:p-6"
        >
          <Wifi className="size-5 rotate-90 self-end opacity-80" />
          <div>
            <p className="text-sm tracking-wide">{name}</p>
            <p className="mt-1 font-mono text-lg tracking-wider sm:text-xl sm:tracking-widest">
              {maskedCardNumber}
            </p>
          </div>
        </section>
      </ItemContent>
    </Item>
  )
}
