export type User = {
  id: string
  name: string
  accountBalance: number
  accountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
    maskedCardNumber: string
  }
}
export type Me = {
  user: User
  csrfToken: string
  accessToken: string
}
