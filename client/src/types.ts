export type DisplayUser = {
  userName: string
  accountBalance: number
  maskedAccountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
  }
}
export type Me = { user: DisplayUser; csrfToken: string }
