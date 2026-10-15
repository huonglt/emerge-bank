import { app } from './app'
import { startSessionCleanup } from './api/sessions'
import https from 'node:https'
import fs from 'node:fs'

const PORT = 3001
const HOST_NAME = 'localhost'

const keyFile = 'certs/localhost-key.pem'
const certFile = 'certs/localhost.pem'

if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
  console.error('TLS certificate not found. Run: npm run certs')
  process.exit(1)
}
// remove expired sessions in the background
startSessionCleanup()

https
  .createServer(
    {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
      minVersion: 'TLSv1.2',
    },
    app
  )
  .listen(PORT, HOST_NAME, () =>
    console.log(`API on https://${HOST_NAME}:${PORT}`)
  )
