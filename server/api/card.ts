import { type Request, type Response } from 'express'
import { cardNameSchema, pinSchema } from '../schema'
import { usersDB } from '../users'
import { isEqual, toDisplayUser } from '../lib/util'
import { randomBytes } from 'node:crypto'
import { NONCE_MS } from '../config'
import { createPinRecord, decryptPinPayload, publicKeyJwk } from '../lib/pin'
import { z } from 'zod'
import { sessions } from './sessions'

export const setCardName = (req: Request, res: Response) => {
  const parsed = cardNameSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Card name invalid' })
  }

  const { name } = parsed.data
  const userId = req.session.userId!
  const user = usersDB.getById(userId)
  // could not find user
  if (!user) {
    return res.status(404).json({ error: 'Could not find user' })
  }
  if (user.card.name) {
    return res
      .status(400)
      .json({ ok: false, error: 'Card name is already set' })
  }
  user.card.name = name

  res.json({ user: toDisplayUser(user) })
}

/**
 * Step 1 of PIN setup: public key + one time use token to this session.
 * @param req
 * @param res
 * @returns
 */
export const pinNonce = (req: Request, res: Response) => {
  const userId = req.session.userId!
  const user = usersDB.getById(userId)
  // could not find user
  if (!user) {
    return res.status(404).json({ error: 'Could not find user' })
  }
  if (!user.card.name || user.card.pin) {
    return res.status(409).json({ error: 'PIN cannot be set right now' })
  }
  /**
   * one time used token. a random string of numbers & letters
   */
  req.session.pinNonce = {
    value: randomBytes(16).toString('base64url'),
    exp: Date.now() + NONCE_MS,
  }

  const userSessionData = sessions.get(user.id)
  if (!userSessionData) {
    return res.status(404).json({ error: 'User session not found' })
  }
  userSessionData.nonce = req.session.pinNonce

  res.json({ publicKey: publicKeyJwk, nonce: req.session.pinNonce.value })
}

export const setCardPIN = (req: Request, res: Response) => {
  const userId = req.session.userId!
  const user = usersDB.getById(userId)
  // could not find user
  if (!user) {
    return res.status(404).json({ error: 'Could not find user' })
  }
  if (!user.card.name) {
    return res.status(409).json({ ok: false, error: 'Name your card first' })
  }
  if (user.card.pin) {
    return res.status(409).json({ ok: false, error: 'PIN is already set' })
  }
  const body = z.object({ encrypted: z.string().max(1024) }).safeParse(req.body)

  /**
   * take and clear the nonce from session
   */
  const userSessionData = sessions.get(user.id)
  if (!userSessionData) {
    return res.status(404).json({ ok: false, error: 'User session not found' })
  }
  const nonce = userSessionData.nonce
  userSessionData.nonce = undefined

  const payload = body.success ? decryptPinPayload(body.data.encrypted) : null

  if (
    !payload ||
    !nonce ||
    Date.now() > nonce.exp ||
    !isEqual(payload.nonce, nonce.value)
  ) {
    return res
      .status(400)
      .json({ error: 'PIN request expired. Please try again' })
  }
  // pin & confirmPin is re-checked on the server
  if (!isEqual(payload.pin, payload.confirmPin)) {
    return res.status(409).json({ error: 'PINs do not match' })
  }
  if (!pinSchema.safeParse(payload.pin).success) {
    return res
      .status(409)
      .json({ error: 'Choose a PIN that is harder to guess' })
  }

  user.card.pin = createPinRecord(payload.pin)
  return res.status(200).json({ ok: true })
}
