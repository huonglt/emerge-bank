import type { User } from './types'

type Props = {
  user: User
}
export const Dashboard = (props: Props) => {
  console.log(`Dashboard: user = ${JSON.stringify(props.user)}`)
  return <div>Dashboard</div>
}
