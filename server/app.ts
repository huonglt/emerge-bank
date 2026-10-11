import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import {
  noCacheControl,
  csrf,
  errorHandler,
  auth,
  sessionCheck,
} from './middleware'
import { me, login, logout } from './api'
import session from 'express-session'
import { cookieOpts } from './config'
import { SESSION_SECRET } from './config'
import { pinNonce, setCardName, setCardPIN } from './api/card'

export const app: Express = express()

// Configure CORS to trust your Vite frontend origin
app.use(
  cors({
    origin: 'http://localhost:5174',
    credentials: true, // Required if your frontend sends cookies, authorization headers, or credentials
  })
)
app.disable('x-powered-by')
app.use(helmet())
// Parse JSON request bodies
app.use(express.json({ limit: '10kb' }))
// This parses the Cookie header and populates req.cookies
app.use(cookieParser())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: cookieOpts,
  })
)

app.use('/api', noCacheControl)
app.use(errorHandler)
app.post('/api/login', login)
app.post('/api/logout', auth, sessionCheck, csrf, logout)
app.get('/api/me', auth, sessionCheck, me)
app.put('/api/card/name', auth, csrf, sessionCheck, setCardName)
app.put('/api/card/pin', auth, csrf, sessionCheck, setCardPIN)
app.get('/api/card/pinNonce', auth, sessionCheck, pinNonce)
