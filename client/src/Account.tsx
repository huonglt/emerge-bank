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
export const Account = () => {
  return (
    <Item variant={'outline'}>
      <ItemHeader>Your account</ItemHeader>
      <BankCard />
      <ItemContent>
        <ItemTitle>Primary</ItemTitle>
        <ItemDescription>XXXXXX1234</ItemDescription>
        <ItemDescription>100NZD</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline">Add money</Button>
        <Button variant="outline">Transfer</Button>
        <Button variant="outline">Pay</Button>
      </ItemActions>
    </Item>
  )
}
