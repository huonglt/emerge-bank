import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import {
  noCacheControl,
  csrf,
  errorHandler,
  auth,
  sessionCheck,
} from './api/middleware'
import { me, login, logout } from './api'
import { pinNonce, setCardName, setCardPIN } from './api/card'

export const app: Express = express()

/**
 * Configure CORS to trust for client
 * credentials is true so client can sends cookies, authorization headers, or credentials
 */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
    ],
  })
)
app.disable('x-powered-by')

// add security header like CSP
app.use(helmet())
// parses JSON bodies into req.body
app.use(express.json({ limit: '10kb' }))

// browsers and proxies dont cache the data
app.use('/api', noCacheControl)

/**
 * apis
 */
app.post('/api/login', login)
app.post('/api/logout', auth, csrf, sessionCheck, logout)
app.get('/api/me', auth, sessionCheck, me)
app.put('/api/card/name', auth, csrf, sessionCheck, setCardName)
app.get('/api/card/pinNonce', auth, sessionCheck, pinNonce) // get request has no csrf token so skip csrf
app.put('/api/card/pin', auth, csrf, sessionCheck, setCardPIN)

// Error handlers only catch errors from routes registered BEFORE them, so this goes last
app.use(errorHandler)
