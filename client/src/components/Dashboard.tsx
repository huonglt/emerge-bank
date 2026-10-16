import { SetupCard } from '@/components/SetupCard'
import type { User } from '@/types'
import { Account } from '@/components/Account'
import { Card } from '@/components/Card'
type Props = {
  user: User
}
export const Dashboard = (props: Props) => {
  const user = props.user
  const needCardName = !user.card?.name
  const needSetPIN = !user.card?.isPINSet

  if (needCardName || needSetPIN) {
    return <SetupCard user={user} />
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Account user={user} />
      <Card user={user} />
    </div>
  )
}
