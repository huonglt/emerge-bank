export type User = {
  id: string
  accountBalance: number
  maskedAccountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
  }
}
export type Me = {
  user: User
  csrfToken: string
  accessToken: string
}
