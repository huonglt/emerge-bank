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
export const app: Express = express()

// Configure CORS to trust your Vite frontend origin
app.use(
  cors({
    origin: 'https://localhost:5173',
    credentials: true, // Required if your frontend sends cookies, authorization headers, or credentials
  })
)
app.disable('x-powered-by')
app.use(setCSP)
//app.use(helmet())
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())

app.use('/api', noCacheControl)
//app.use('/api', csrfDefence)
app.use(errorHandler)
app.get('/', (req, res) => {
  res.send('Hello World')
})
app.post('/api/login', login)
app.post('/api/logout', auth, csrf, logout)
app.get('/api/me', auth, me)
