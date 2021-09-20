<!-- Project's logo -->
<p align="center">
  <a href="https://www.lokapp.io/">
    <img src="documentation/logo.png" alt="Logo" width="80">
  </a>

  <h2 align="center">Lokapp</h2>

  <p align="center">
    An API to help you manage all your project's translations.
    <br />
    <br />
  </p>
</p>

<!-- Table of Contents -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About the project</a>
      <ul>
        <li><a href="#built-with">Built with</a></li>
        <li><a href="#features">Features</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#run-tests">Run tests</a></li>
        <li><a href="#environment-variables">Environment variables</a></li>
      </ul>
    </li>
    <li><a href="#documentation">API Documentation</a></li>
    <li>
      <a href="#usage">Usage</a>
      <ul>
        <li><a href="#authentication">Authentication</a></li>
        <li><a href="#postman-collection">Postman collection</a></li>
        <li><a href="#demo">Demo</a></li>
      </ul>
    </li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>


## About the project

This API provides you an environment to store the translations of several projects.

You can also checkout our [webapp](https://github.com/lokappio/lokapp-client) to manage your translations and export them as Android, iOS or JSON ready-to-use localized files.


### Built with

Here are some tools or frameworks this API has been built with:

* [NestJS](https://nestjs.com)
* [TypeORM](https://typeorm.io/#/)
* [PostgreSQL](https://www.postgresql.org/download/)
* [pg](https://github.com/brianc/node-postgres/tree/master/packages/pg)
* [Passport](https://www.passportjs.org)
* [Winston](https://github.com/winstonjs/winston)

### Features

#### Projects

Create as many projects as you want, each one with its own languages, translations and users. 

#### Roles and invitations

Manage your users and who can access to your projects.

See the [Role](documentation/roles.md) documentation to learn more about the different roles the API can handle.

#### Groups

Create groups within a project in order to get a tidy list of translations.

#### Translations

Specify which languages your project supports, then manage your translation keys and their translated content.

Create groups to organize your translations by module or by feature for instance.

#### Plurals

Handle both singular and plural translations. 

See the [Plural](documentation/plurals.md) documentation to learn more about how to deal with plurals strings.


## Getting Started

### Prerequisites

* [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
* [PostgreSQL](https://www.postgresql.org/download/)

### Installation

1. Clone the repo
   ```
   git clone https://github.com/lokappio/lokapp-api.git
   ```
2. Install NPM packages
   ```
   npm install
   ```
3. Edit your [environment variables](#environment-variables)
4. Launch the database
5. Start the API
   ```
   npm run start:dev
   ```

### Run tests

To run all the end-to-end tests, executing the following command:
```
npm run test:e2e
```

### Environment variables

To make the API running, you need to specify your database URL in the `DATABASE_URL` variable.

You can copy the `.env.sample` file in a `.env` and edit it: 
```
cp .env.sample .env
```

## API Documentation

Once the API is up and running, you can access its Swagger documentation at [http://localhost:5000/api/documentation](http://localhost:5000/api/documentation/#/).

## Usage

While the API is running, you can create any client to interact with the API or play with [Postman](https://www.postman.com) to call the diffrent endpoints.

### Authentication

The majority of the endpoints require you to be autenticated to access it. To do so, you need to provide a token within the `Authorization` header of the request:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

See the [Authentication](documentation/authentication.md) documentation to learn more about the current authentication.

### Postman collection

A Postman's collection can be found [here](postman-collection/).

### Demo

To try out our product, you can use our [demo](https://demo.lokapp.io).

## License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.


## Acknowledgements

<a href="https://playmoweb.com/">
  <img src="documentation/playmoweb-logo.png" alt="Playmoweb-Logo" width="64">
</a>

*Lokapp* is built by [Playmoweb](https://playmoweb.com), a mobile agency building web apps and native Android and iOS applications.
