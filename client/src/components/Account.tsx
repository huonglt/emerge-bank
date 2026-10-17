import { Button } from '@/components/ui/button'

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemHeader,
  ItemActions,
} from '@/components/ui/item'
import { CashCoinMedia } from '@/components/CashCoinMedia'
import type { User } from '@/types'
import { Todo } from '@/components/Todo'
import { formatCurrency } from '@/lib/utils'
type Props = {
  user: User
}

export const Account = (props: Props) => {
  const user = props.user
  const { name, accountBalance, accountNumber } = user

  return (
    <Item variant={'outline'}>
      <ItemHeader className="font-semibold">Your account</ItemHeader>
      <CashCoinMedia />
      <ItemContent>
        <ItemDescription>{name}</ItemDescription>
        <ItemDescription>{accountNumber}</ItemDescription>
        <ItemDescription>{formatCurrency(accountBalance)}</ItemDescription>
      </ItemContent>
      <ItemActions className="flex-wrap">
        <Todo trigger={<Button variant="outline">Add money</Button>} />
        <Todo trigger={<Button variant="outline">Transfer</Button>} />
        <Todo trigger={<Button variant="outline">Pay</Button>} />
      </ItemActions>
    </Item>
  )
}
