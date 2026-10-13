# Digital bank app

This is a demo server app to illustrate handling user data in a secure & safe way for a financial product.<br/>
It focuces on:

- simple secure session and token management
- how secure data is read down and displayed on the frontend

This server running on HTTPS/TLS on localhost

Workflows supported by the app:

- auth
- session check
- csrf token check
- login
- logout
- set up a virtual bank card: name and PIN
- user data

## How workflows are handled to make it safe and secure for users?

A chain of middlewares are performed on each request to authenticate & verify user requests:

- auth: check the JWT access token is valid and not expired
- session: check for server side session existed for that request
- csrf: check the csrfToken from the request to match with the csrfToken on the user session

csrf middleware is needed for server state change request only.

All HTTP response headers are set via helmet to provide protection. Headers include `CSP`, `Strict-Transport-Security`, and `Cross-Origin-Resource-Policy`

### Login:

- User provided name & password is verified againts a hashed key, with a random salt generated at runtime
- Create a new session with userId as key
- Generate a JWT access token with a secret on the server. By default, the access token is short lived, expires in 5 min
- Generate a CSRF token which is crypto token to protect against Cross-Site Request Forgery (CSRF) attacks

### Logout

- Server side session is cleared

### User data

- return user data for client
- PIN data is not returned, only isPinSet is returned
- card number not returned, only maskedCardNumber is returned

### Set bank card name:

- bank card name is saved to user data

### Set bank card PIN:

- PIN is very senstive. A PIN authorizes payments so a leaked PIN is high impact
- 2 step process:
- Step 1:
  - Server sends a publicKey and a one time used token (nonce) to client for PIN encryption
- Step 2:
  - Server uses it private key to decrypt the encrypted data from client
  - The decrypted data will contain the one time used token (nonce), the PIN, and confirm PIN
  - The nonce is validated against a copy of its on the server, and expiration
  - The nonce is cleared immediately after read. This to make it single-use token
  - Server re-checks for PIN, and confirm PIN matching
  - If all valid, PIN is saved to user data (will not do this for production)

## Tech stack

- `ExpressJS`, `Typescript`
- Schema vaidation: `zod`
- Testing: `Vitest`
- Tooling: `Eslint`, `Prettier`
- `Node v26.82`

## How to run

Start the server:

- go to `server` folder
- install dependencies: `npm install`
- start the server: `npm run dev:server`

## Limitations

Due to time constraints, this app for demo purposes only, not for production use.<br/>
Future improvements:

- use MFA for more secured authentication
- secrets should be stored in a vault
- complex session management like auto cleared session when token expires
- use actual database
- PIN card should not be stored on server, should be stored by card issuer instead
- add rate limit on request calls
- handle concurrency
- add permissions to user schema and check api requests for authorization
- config can be setup via environment variables
