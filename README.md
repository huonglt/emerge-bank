# Digital bank app

This is a demo app to illustrate a financial web app handling user data in a secure & safe way.<br/>
It focuces on:

- secure data is captured on the frontend and transmitted to the backend safely
- simple secure session and token management
- how secure data is read down and displayed on the frontend

The client is a `React` + `Typescript` + +`shadcn` + `tailwindcss` app. Read the [README](client/README.md)<br/>

The server is a `NodeJs`, `ExpressJs` app. Read the [README](server/README.md)

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

By default, client & server both run on `localhost`.<br/>

Server running on `https://localhost:3001`, client on port `5173`, or `5174`<br/>

If you need to change server url, change in `server/config.ts`<br/>

- To login, use either demo user [`helen`, `helen123`], or [`jane`, `jan123`]
    - User `helen` will require setting up both card name & card PIN
    - User `jane` will require setting up card PIN only


### Screenshots

Click here to view the [screenshots](client/screenshots/screenshots.jpg)