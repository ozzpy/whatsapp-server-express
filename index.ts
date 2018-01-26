import { schema } from "./schema";

/*import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import * as koaBody from 'koa-bodyparser';
import { graphqlKoa, graphiqlKoa } from 'apollo-server-koa';
import * as cors from '@koa/cors';

const app = new Koa();
const router = new KoaRouter();
const PORT = 3000;

app.use(cors({
  origin: '*',
}));
app.use(koaBody());
router.post('/graphql', graphqlKoa({schema}));
router.get('/graphiql', graphiqlKoa({endpointURL: '/graphql'}));
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(PORT);*/

import * as express from 'express';
import * as bodyParser from 'body-parser';
import { graphiqlExpress, graphqlExpress } from 'apollo-server-express';
import * as cors from 'cors';
import * as passport from 'passport';
import { db, getRandomId, User } from "./db";
import * as basicStrategy from 'passport-http';
import * as bcrypt from 'bcrypt-nodejs';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

const PORT = 3000;

const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());

function generateHash(password: string) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
}

function validPassword(password: string, localPassword: string) {
  return bcrypt.compareSync(password, localPassword);
}

passport.use('basic-signin', new basicStrategy.BasicStrategy(
  function (username, password, done) {
    const user = db.users.filter(user => user.username === username && validPassword(password, user.password))[0];
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  }
));

passport.use('basic-signup', new basicStrategy.BasicStrategy({passReqToCallback: true},
  function (req, username, password, done) {
    const userExists = db.users.filter(user => user.username === username && validPassword(password, user.password))[0];
    if (userExists || !req.body.name) {
      return done(null, false);
    }

    const user = {
      id: getRandomId(),
      username,
      password: generateHash(password),
      name: req.body.name,
    } as User;

    console.log(user);

    db.users.push(user);

    return done(null, user);
  }
));

app.use(bodyParser.json());
app.post('/signup',
  passport.authenticate('basic-signup', {session: false}),
  function (req, res) {
    res.json(req.user);
  });
app.use(passport.authenticate('basic-signin', {session: false}));
app.use(loggingMiddleware);

app.post('/signin',
  function (req, res) {
    res.json(req.user);
  });

app.use('/graphql', graphqlExpress(req => ({
  schema: schema,
  context: req,
})));

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  subscriptionsEndpoint: `ws://localhost:3000/subscriptions`,
}));

function loggingMiddleware(req: any, res: any, next: any) {
  //console.log(req.user);
  next();
}

//app.listen(PORT);

// Wrap the Express server
const ws = createServer(app);
ws.listen(PORT, () => {
  console.log(`Apollo Server is now running on http://localhost:${PORT}`);
  // Set up the WebSocket for handling GraphQL subscriptions
  new SubscriptionServer({
    onConnect: (connectionParams: any, webSocket: any) => {
      if (connectionParams.authToken) {
        // create a buffer and tell it the data coming in is base64
        const buf = new Buffer(connectionParams.authToken.split(' ')[1], 'base64');
        // read it back out as a string
        const [username, password]: string[] = buf.toString().split(':');
        if (username && password) {
          const user = db.users
            .filter(user => user.username === username && validPassword(password, user.password))[0];

          if (user) {
            return {user};
          }
        }
      }

      throw new Error('Missing auth token!');
    },
    execute,
    subscribe,
    schema
  }, {
    server: ws,
    path: '/subscriptions',
  });
});