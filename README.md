# Dit is oud.

Binnenkort hebben we een verpakte versie met API, CMS en zo nog wat onderdelen. De losse onderdelen kun je nu al vinden op
https://github.com/Amsterdam/openstad-frontend
https://github.com/Amsterdam/openstad-api
https://github.com/Amsterdam/openstad-image-server
https://github.com/Amsterdam/openstad-oauth2-server/


# De Stem van...
This is a platform for supporting online participatory democracy, currently in development by the municipality of Amsterdam. Just as this readme, the project is still very much in development, but the steps listed below should get you started.

This repository contains the frontend as well as the backend code. Because there is no general example template yet, an amsterdam-styled one is included. You can copy and modify it however you want, as long as it's not publicized with the current amsterdam styling intact.

## Requirements
1. Node v7+
2. MySQL 5.7+

## Setup
Below are the minimal steps you need to perform in order to get the application up and running.

### 1. Create `config/local.json`
This project uses the `config` package for configuration. This means all possible paramaters can be found in `config/default.json`, are overridden by the settings in `config/development.json` or `config/production.json` (depending on your `NODE_ENV` environment variable) and are finally overridden by your `config/local.json`.

You should at least set the following parameters:

1. `database` connection.
2. `sentry.url`, or `sentry.active`  to `false` if you do not have an [sentry.io](//sentry.io) account.
3. `notifications.admin.emailAddress`, even if you don't set up a mail server connection.
4. `debug` to `true`. This enables the `dev/login/{userId}` route, so you can login as any user you like.

### 2. Install dependencies
```bash
# For the dropzone and trix fontend libraries used in the interface
git submodule init
git submodule update

npm install
```

### 3. Initiate database
This will create all database tables, and adds fixture data.

```bash
node reset.js
```

### 4. Run the server
```bash
npm server.js
```

That should do it. The application echoes on which port it's listening, which is 8082 if you're running in development mode. Visit [http://localhost:8082](http://localhost:8082).
