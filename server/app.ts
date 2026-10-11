import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import cors from 'cors'
//import helmet from 'helmet'
import {
  setCSP,
  errorHandler,
  noCacheControl,
  csrfDefence,
  csrf,
} from './middleware'
import { me, auth, login, logout } from './api'
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
app.use(setCSP)
//app.use(helmet())
// Parse JSON request bodies
app.use(express.json({ limit: '10kb' }))
// Enable cookie parsing middleware
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
//app.use('/api', csrfDefence)
app.use(errorHandler)
app.post('/api/login', login)
app.post('/api/logout', auth, logout)
app.get('/api/me', auth, me)
app.put('/api/card/name', auth, setCardName)
app.put('/api/card/pin', auth, setCardPIN)
app.get('/api/card/pinNonce', auth, pinNonce)
