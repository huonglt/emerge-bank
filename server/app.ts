import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import { setCSP, errorHandler, noCacheControl, csrfDefence } from './middleware'

export const app: Express = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())
app.use(setCSP)
app.use('/api', noCacheControl)
app.use('/api', csrfDefence)
app.use(errorHandler)
