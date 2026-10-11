import { CardName } from './CardName'
import type { User } from './types'

type Props = {
  user: User
}
export const SetupCard = (props: Props) => {
  const user = props.user
  const needCardName = !user.card?.name
  const needSetPIN = !needCardName && !user.card.isPINSet
  return (
    <div className="content">
      <div className="text-left w-full">
        We need to setup your card before you can use it
      </div>
      {needCardName && <CardName />}
      {needSetPIN && <div>Need card pin</div>}
    </div>
  )
}
