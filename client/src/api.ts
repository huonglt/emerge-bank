// CSRF token lives in memory only: not in localStorage, not in a cookie JS can read.
// The session token itself is an HttpOnly cookie, so this code never sees it.
let csrfToken = ''
export const setCsrf = (t: string) => {
  csrfToken = t
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const method = init.method ?? 'GET'
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' && { 'X-CSRF-Token': csrfToken }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new ApiError(res.status, data.error ?? 'Something went wrong')
  return data as T
}
