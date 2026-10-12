# Virtual bank app

This is a demo app to illustrate a financial web app handling user data in a secure & safe way.
It focuces on:

- secure data is captured on the frontend and transmitted to the backend safely
- simple secure session and token management
- how secure data is read down and displayed on the frontend

The client is a React + Typescript + tailwindcss app. [README](client/README.md)<br/>

The server is a NodeJs, Express app. [README](server/README.md)

### To start

- Start client
    - go to client folder
    - install dependencies: `npm install`
    - run in dev mode: `npm run dev`
    - or run in preview mode: `npm run build`, then `npm run preview`

- Start server
    - go to server folder
    - install dependencies: `npm install`
    - run it: `npm run dev:server`

By default, client & server both run on localhost. Server on port 3001, client on port 5173, or 5174
If you need to change server url, change in config.ts

To login, use either demo user [`helen`, `helen123`], or [`jane`, `jan123`]

### Screenshots

Click here to view the [screenshots](client/screenshots/screenshots.jpg)