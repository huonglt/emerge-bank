type UserSessionData = {
  accessToken: string
  csrfToken: string
  nonce:
    | {
        value: string
        exp: number
      }
    | undefined
}
// simple map to manage session on server
export const sessions = new Map<string, UserSessionData>()
