# Authentication

Currently, our authentication system require you to use Firebase Authentication. 

You're free to use another system if you want to, but you will have to change some parts of the API.

## Requirements

### Service account

If you choose to use Firebase Authentication, you need to get a `service-account-file.json`. 

Once you have it, copy its content into a `FIREBASE_CONFIG` environment variable (in your `.env` file).

After that, each request you make need to be made with an `Authorization` header and a valid Bearer token:

```
Authorization: Bearer your-valid-JWT-here
```

### Boostraping

The initialization of the Firebase application is done in the `custom-bootstrap.ts` file. 

You can remove the content of the `customBootstrap()` function if don't want to use Firebase or change its content to initizalize your own authentication provider.


## Authenticating a user

Lokapp also has its own `users` table, that's why you need to register yourself into the Lokapp system.

To do so, call `POST /api/v1/auth/register` with a valid token. The userId and the email read from the JWT will be used to store the user within the Lokapp's databas (see `auth-jwt.strategy.ts`).

All other protected routes also require a valid JWT. The `auth-jwt-user.strategy.ts` will decode the token, extract the userId within, and then get the associated `user` stored in the Lokapp's database.


## Postman collection

The `Auth - Get token` request in the [Postman collection](../postman-collection) stores the JWT in the response into an environment variable. 
This sotred token is then injected into each request you made.