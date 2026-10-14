import type { NextFunction, Request, Response } from 'express'
import { vi } from 'vitest'

// Fake request, response and next() for testing middleware on its own.
export function ctx(
  reqOverrides: Record<string, unknown> = {},
  locals: Record<string, unknown> = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = { locals: { ...locals }, status: vi.fn(() => res), json: vi.fn(() => res), set: vi.fn(() => res) }
  const next = vi.fn()
  const req = { headers: {}, body: {}, ...reqOverrides }
  return {
    req: req as unknown as Request,
    res: res as Response,
    next: next as unknown as NextFunction,
    spies: { status: res.status as ReturnType<typeof vi.fn>, json: res.json as ReturnType<typeof vi.fn>, set: res.set as ReturnType<typeof vi.fn>, next },
  }
}
