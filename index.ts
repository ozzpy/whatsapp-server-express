// For TypeORM
import "reflect-metadata";

import { schema } from "./schema";
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { graphiqlExpress, graphqlExpress } from 'apollo-server-express';
import * as cors from 'cors';
import * as passport from 'passport';
import * as basicStrategy from 'passport-http';
import * as bcrypt from 'bcrypt-nodejs';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { createConnection } from "typeorm";
import { User } from "./entity/User";
import { Chat } from "./entity/Chat";
import { Message } from "./entity/Message";
import { Recipient } from "./entity/Recipient";
import * as moment from "moment";
import { MessageType } from "./db";

/*import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import * as koaBody from 'koa-bodyparser';
import { graphqlKoa, graphiqlKoa } from 'apollo-server-koa';
import { schema } from "./schema";
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


createConnection().then(async connection => {
  async function addSampleData() {
    const user1 = new User({
      username: 'ethan',
      password: '$2a$08$NO9tkFLCoSqX1c5wk3s7z.JfxaVMKA.m7zUDdDwEquo4rvzimQeJm', // 111
      name: 'Ethan Gonzalez',
      picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
      phone: '+391234567890',
    });
    await connection.manager.save(user1);

    const user2 = new User({
      username: 'bryan',
      password: '$2a$08$xE4FuCi/ifxjL2S8CzKAmuKLwv18ktksSN.F3XYEnpmcKtpbpeZgO', // 222
      name: 'Bryan Wallace',
      picture: 'https://randomuser.me/api/portraits/thumb/men/2.jpg',
      phone: '+391234567891',
    });
    await connection.manager.save(user2);

    const user3 = new User({
      username: 'avery',
      password: '$2a$08$UHgH7J8G6z1mGQn2qx2kdeWv0jvgHItyAsL9hpEUI3KJmhVW5Q1d.', // 333
      name: 'Avery Stewart',
      picture: 'https://randomuser.me/api/portraits/thumb/women/1.jpg',
      phone: '+391234567892',
    });
    await connection.manager.save(user3);

    const user4 = new User({
      username: 'katie',
      password: '$2a$08$wR1k5Q3T9FC7fUgB7Gdb9Os/GV7dGBBf4PLlWT7HERMFhmFDt47xi', // 444
      name: 'Katie Peterson',
      picture: 'https://randomuser.me/api/portraits/thumb/women/2.jpg',
      phone: '+391234567893',
    });
    await connection.manager.save(user4);

    const user5 = new User({
      username: 'ray',
      password: '$2a$08$6.mbXqsDX82ZZ7q5d8Osb..JrGSsNp4R3IKj7mxgF6YGT0OmMw242', // 555
      name: 'Ray Edwards',
      picture: 'https://randomuser.me/api/portraits/thumb/men/3.jpg',
      phone: '+391234567894',
    });
    await connection.manager.save(user5);

    const user6 = new User({
      username: 'niko',
      password: '$2a$08$fL5lZR.Rwf9FWWe8XwwlceiPBBim8n9aFtaem.INQhiKT4.Ux3Uq.', // 666
      name: 'Niccolò Belli',
      picture: 'https://randomuser.me/api/portraits/thumb/men/4.jpg',
      phone: '+391234567895',
    });
    await connection.manager.save(user6);

    const user7 = new User({
      username: 'mario',
      password: '$2a$08$nDHDmWcVxDnH5DDT3HMMC.psqcnu6wBiOgkmJUy9IH..qxa3R6YrO', // 777
      name: 'Mario Rossi',
      picture: 'https://randomuser.me/api/portraits/thumb/men/5.jpg',
      phone: '+391234567896',
    });
    await connection.manager.save(user7);




    await connection.manager.save(new Chat({
      allTimeMembers: [user1, user3],
      listingMembers: [user1, user3],
      messages: [
        new Message({
          sender: user1,
          content: 'You on your way?',
          createdAt: String(moment().subtract(1, 'hours').unix()),
          type: MessageType.TEXT,
          holders: [user1, user3],
          recipients: [
            new Recipient({
              user: user3,
            }),
          ],
        }),
        new Message({
          sender: user3,
          content: 'Yep!',
          createdAt: String(moment().subtract(1, 'hours').add(5, 'minutes').unix()),
          type: MessageType.TEXT,
          holders: [user1, user3],
          recipients: [
            new Recipient({
              user: user1,
            }),
          ],
        }),
      ],
    }));

    await connection.manager.save(new Chat({
      allTimeMembers: [user1, user4],
      listingMembers: [user1, user4],
      messages: [
        new Message({
          sender: user1,
          content: 'Hey, it\'s me',
          createdAt: String(moment().subtract(2, 'hours').unix()),
          type: MessageType.TEXT,
          holders: [user1, user4],
          recipients: [
            new Recipient({
              user: user4,
            }),
          ],
        }),
      ],
    }));

    await connection.manager.save(new Chat({
      allTimeMembers: [user1, user5],
      listingMembers: [user1, user5],
      messages: [
        new Message({
          sender: user1,
          content: 'I should buy a boat',
          createdAt: String(moment().subtract(1, 'days').unix()),
          type: MessageType.TEXT,
          holders: [user1, user5],
          recipients: [
            new Recipient({
              user: user5,
            }),
          ],
        }),
        new Message({
          sender: user1,
          content: 'You still there?',
          createdAt: String(moment().subtract(1, 'days').add(16, 'hours').unix()),
          type: MessageType.TEXT,
          holders: [user1, user5],
          recipients: [
            new Recipient({
              user: user5,
            }),
          ],
        }),
      ],
    }));

    await connection.manager.save(new Chat({
      allTimeMembers: [user3, user4],
      listingMembers: [user3, user4],
      messages: [
        new Message({
          sender: user3,
          content: 'Look at my mukluks!',
          createdAt: String(moment().subtract(4, 'days').unix()),
          type: MessageType.TEXT,
          holders: [user3, user4],
          recipients: [
            new Recipient({
              user: user4,
            }),
          ],
        }),
      ],
    }));

    await connection.manager.save(new Chat({
      allTimeMembers: [user2, user5],
      listingMembers: [user2, user5],
      messages: [
        new Message({
          sender: user2,
          content: 'This is wicked good ice cream.',
          createdAt: String(moment().subtract(2, 'weeks').unix()),
          type: MessageType.TEXT,
          holders: [user2, user5],
          recipients: [
            new Recipient({
              user: user5,
            }),
          ],
        }),
        new Message({
          sender: user5,
          content: 'Love it!',
          createdAt: String(moment().subtract(2, 'weeks').add(10, 'minutes').unix()),
          type: MessageType.TEXT,
          holders: [user2, user5],
          recipients: [
            new Recipient({
              user: user2,
            }),
          ],
        }),
      ],
    }));

    await connection.manager.save(new Chat({
      allTimeMembers: [user1, user6],
      listingMembers: [user1],
    }));

    await connection.manager.save(new Chat({
      allTimeMembers: [user2, user1],
      listingMembers: [user2],
    }));

    await connection.manager.save(new Chat({
      name: 'Ethan\'s group',
      picture: 'https://randomuser.me/api/portraits/thumb/lego/1.jpg',
      allTimeMembers: [user1, user3, user4, user6],
      listingMembers: [user1, user3, user4, user6],
      actualGroupMembers: [user1, user4, user6],
      admins: [user1, user6],
      owner: user1,
      messages: [
        new Message({
          sender: user1,
          content: 'I made a group',
          createdAt: String(moment().subtract(2, 'weeks').unix()),
          type: MessageType.TEXT,
          holders: [user1, user3, user4, user6],
          recipients: [
            new Recipient({
              user: user3,
            }),
            new Recipient({
              user: user4,
            }),
            new Recipient({
              user: user6,
            }),
          ],
        }),
        new Message({
          sender: user1,
          content: 'Ops, Avery was not supposed to be here',
          createdAt: String(moment().subtract(2, 'weeks').add(2, 'minutes').unix()),
          type: MessageType.TEXT,
          holders: [user1, user4, user6],
          recipients: [
            new Recipient({
              user: user4,
            }),
            new Recipient({
              user: user6,
            }),
          ],
        }),
        new Message({
          sender: user4,
          content: 'Awesome!',
          createdAt: String(moment().subtract(2, 'weeks').add(10, 'minutes').unix()),
          type: MessageType.TEXT,
          holders: [user1, user4, user6],
          recipients: [
            new Recipient({
              user: user1,
            }),
            new Recipient({
              user: user6,
            }),
          ],
        }),
      ],
    }));

    await connection.manager.save(new Chat({
      name: 'Ray\'s group',
      allTimeMembers: [user3, user6],
      listingMembers: [user3, user6],
      actualGroupMembers: [user3, user6],
      admins: [user6],
      owner: user6,
    }));
  }
  await addSampleData();




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
    async function (username, password, done) {
      const user = await connection.getRepository(User).findOne({where: { username }});
      if (user && validPassword(password, user.password)) {
        return done(null, user);
      }
      return done(null, false);
    }
  ));

  passport.use('basic-signup', new basicStrategy.BasicStrategy({passReqToCallback: true},
    async function (req: any, username: any, password: any, done: any) {
      const userExists = !!(await connection.getRepository(User).findOne({where: { username }}));
      if (!userExists && password && req.body.name) {
        const user = await connection.manager.save(new User({
          username,
          password: generateHash(password),
          name: req.body.name,
        }));
        return done(null, user);
      }
      return done(null, false);
    }
  ));

  app.use(bodyParser.json());
  app.post('/signup',
    passport.authenticate('basic-signup', {session: false}),
    function (req, res) {
      res.json(req.user);
    });
  app.use(passport.authenticate('basic-signin', {session: false}));
  //app.use(loggingMiddleware);

  app.post('/signin',
    function (req, res) {
      res.json(req.user);
    });

  app.use('/graphql', graphqlExpress(req => {
    return {
      schema: schema,
      context: {
        user: req!['user'],
        connection,
      },
    }
  }));

  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://localhost:3000/subscriptions`,
  }));

  //function loggingMiddleware(req: any, res: any, next: any) {
  //  console.log(req.user);
  //  next();
  //}

//app.listen(PORT);

// Wrap the Express server
  const ws = createServer(app);
  ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://localhost:${PORT}`);
    // Set up the WebSocket for handling GraphQL subscriptions
    new SubscriptionServer({
      onConnect: async (connectionParams: any, webSocket: any) => {
        if (connectionParams.authToken) {
          // create a buffer and tell it the data coming in is base64
          const buf = new Buffer(connectionParams.authToken.split(' ')[1], 'base64');
          // read it back out as a string
          const [username, password]: string[] = buf.toString().split(':');
          if (username && password) {
            const user = await connection.getRepository(User).findOne({where: { username }});

            if (user && validPassword(password, user.password)) {
              return {user, connection};
            } else {
              throw new Error('Wrong credentials!');
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
}).catch(error => console.log(error));
