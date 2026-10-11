import { SetupCard } from './SetupCard'
import type { User } from './types'
import { Account } from './Account'
type Props = {
  user: User
}
export const Dashboard = (props: Props) => {
  const user = props.user
  const needCardName = !user.card?.name
  const needSetPIN = !needCardName && !user.card?.isPINSet

  if (needCardName || needSetPIN) {
    return <SetupCard user={user} />
  }

  return <Account user={user} />
}
