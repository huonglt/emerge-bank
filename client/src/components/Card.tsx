import {
  Item,
  ItemContent,
  ItemTitle,
  ItemHeader,
  ItemDescription,
} from '@/components/ui/item'
import { CardMedia } from '@/components/CardMedia'

import type { User } from '@/types'

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
      <CardMedia />
      <ItemContent>
        <ItemTitle>{name}</ItemTitle>
        <ItemDescription>{maskedCardNumber}</ItemDescription>
      </ItemContent>
    </Item>
  )
}
