import { CardName } from '@/components/CardName'
import type { User } from '@/types'
import { CardPIN } from '@/components/CardPIN'

type Props = {
  user: User
}
export const SetupCard = (props: Props) => {
  const user = props.user
  const needCardName = !user.card?.name
  const needPIN = !needCardName && !user.card?.isPINSet

  return (
    <div className="content">
      <div className="w-full">
        We need to setup your card before you can use it
      </div>
      {needCardName && <CardName />}
      {needPIN && <CardPIN />}
    </div>
  )
}
