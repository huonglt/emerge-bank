import { Item, ItemContent, ItemTitle, ItemHeader } from '@/components/ui/item'
import { CardMedia } from './CardMedia'

import type { User } from '@/types'

type Props = {
  user: User
}
export const Card = (props: Props) => {
  const {
    card: { maskedAccountNumber },
  } = props.user

  return (
    <Item variant={'outline'}>
      <ItemHeader>Your card</ItemHeader>
      <CardMedia />
      <ItemContent>
        <ItemTitle>{maskedAccountNumber}</ItemTitle>
      </ItemContent>
    </Item>
  )
}
