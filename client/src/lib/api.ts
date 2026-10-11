// CSRF token lives in memory only: not in localStorage, not in a cookie JS can read.
// The session token itself is an HttpOnly cookie, so this code never sees it.
let csrfToken = ''
let accessToken = ''
export const setCsrf = (t: string) => {
  csrfToken = t
}
export const setAccessToken = (t: string) => (accessToken = t)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const serverPath = 'https://localhost:3001'

export const api = async <T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> => {
  const method = options.method ?? 'GET'
  const res = await fetch(`${serverPath}/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(method !== 'GET' && {
        'X-CSRF-Token': csrfToken,
      }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Something went wrong')
  }
  return data as T
}
