import type { User } from './types'

type Props = {
  user: User
}
export const Dashboard = (props: Props) => {
  console.log(`Dashboard: user = ${JSON.stringify(props.user)}`)
  const user = props.user
  const needCardName = !user.card?.name
  return (
    <div className="flex mb-4 w-full">
      <div className="w-2/4  h-12">
        <button
          className="bg-indigo-500 text-white w-30 p-2 mt-1 rounded-md cursor-pointer "
          type="button"
        >
          Log out
        </button>
        <div>
          {needCardName && (
            <div>
              Enter your card name <input></input>
            </div>
          )}
        </div>
      </div>
      <div className="w-2/4  h-12"></div>
    </div>
  )
}
