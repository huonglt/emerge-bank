import { Button } from '@/components/ui/button'

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemHeader,
  ItemActions,
} from '@/components/ui/item'
import { BankCard } from './BankCard'
import type { User } from '../types'
type Props = {
  user: User
}

export const Account = (props: Props) => {
  const user = props.user

  const { name, accountBalance, maskedAccountNumber } = user

  return (
    <Item variant={'outline'}>
      <ItemHeader>Your account</ItemHeader>
      <BankCard />
      <ItemContent>
        <ItemTitle>{name}</ItemTitle>
        <ItemDescription>{maskedAccountNumber}</ItemDescription>
        <ItemDescription>{accountBalance}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline">Add money</Button>
        <Button variant="outline">Transfer</Button>
        <Button variant="outline">Pay</Button>
      </ItemActions>
    </Item>
  )
}
