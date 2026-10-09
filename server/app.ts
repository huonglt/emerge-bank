import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'

//import helmet from 'helmet'
import {
  setCSP,
  errorHandler,
  noCacheControl,
  csrfDefence,
  auth,
} from './middleware'
import { me } from './api'
export const app: Express = express()

app.disable('x-powered-by')
app.use(setCSP)
//app.use(helmet())
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.use('/api', noCacheControl)
app.use('/api', csrfDefence)
app.use(errorHandler)
app.get('/', (req, res) => {
  res.send('Hello World')
})

app.get('/api/me', auth, me)
