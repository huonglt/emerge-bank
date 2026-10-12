# Virtual bank app

This is a demo app to illustrate a financial web app handling user data in a secure & safe way.
It focuces on:

- secure data is captured on the frontend and transmitted to the backend safely
- simple secure session and token management
- how secure data is read down and displayed on the frontend

Workflows supported by the app:

- login
- logout
- auto logout when access token expires
- set up a virtual bank card: name and PIN
- dashboard

## How workflows are handled to make it safe and secure for users?

First, all communications between client & server is on HTTPS, with LTS, so it is secure.

### Login:

- Raw data of username and password are sent over HTTPS
- HTTPS will encrypts the data in transit. Server will hash it
- User receives JWT access token, and csrfToken after login
- JWT access token, and csrfToken are stored in memory, not in browser localStorage, sessionStorage, or cookies
- JWT access token will be attached to all api request calls
- csrfToken will be attached to api requests that modify server state like POST, PUT, DELETE
- JWT access token will be used for authentication on the server
- csrfToken will be validated on server for added extra security

### Set bank card name:

- Raw data of card name is sent over HTTPS
- HTTPS will encrypts the data in transit

### Set bank card PIN:

- PIN is very senstive. A PIN authorizes payments so a leaked PIN is high impact
- On the UI, the PIN lives only in uncontrolled inputs: never in React state, the query cache, or storage.
- PIN is read at submit time and cleared straight away.
- On submit, PIN is encrypted with the server public key (RSA-OAEP) and a single-use token (nonce)
- The PIN is never sent or logged in readable form
- PIN is sent over the HTTPS
- HTTPS will encrypts the data in transit

### Dashboard

- User senstive data like PIN, or card number never be sent to browser
- Only masked sensitive data is sent to browser and show it on UI

### Logout

- JWT access token and csrf token is cleared
- All server queries data is cleared
- Browser will auto log out when JWT access token expires

## Tech stack

- Vite, React, Typescript
- Form validation: React hook form + Zod
- UI component and styling: tailwindcss, shadcn, lucide
- Server state management: tanstack query
- Testing: Vitest, testing-library
- Tooling: Eslint, Prettier
- Node: v26.82

## How to run

Start the client:

- go to client folder
- install dependencies: npm install
- start the app: npm run:dev
- run test: npm run test

Start the server:

- go to server folder
- install dependencies: npm install
- start the app: npm run dev:server

By default, client & server both run on localhost. Server on port 3001, client on port 5173, or 5174
If you need to change server url, change in config.ts

## Limitations

Due to time constraints, this app for demo purposes only, not for production use.
Future improvements:

- setup for prod use
- config can be setup by environment variables
- add integration tests
- more features
- better UX
