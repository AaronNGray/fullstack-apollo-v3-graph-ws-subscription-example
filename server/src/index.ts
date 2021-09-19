import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import ws from 'ws';
import { execute, subscribe } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
import { ApolloServer, gql } from 'apollo-server-express';
import expressPlayground from "graphql-playground-middleware-express";

const MESSAGE_CREATED = 'MESSAGE_CREATED';

const pubSub = new PubSub();

const typeDefs = gql`
  type Query {
    messages: [Message!]!
  }

  type Subscription {
    messageCreated: Message
  }

  type Message {
    id: String
    content: String
  }
`;

const resolvers = {
  Query: {
    messages: () => [
      { id: 0, content: 'Hello!' },
      { id: 1, content: 'Bye!' },
    ],
  },
  Subscription: {
    messageCreated: {
      subscribe: () => pubSub.asyncIterator(MESSAGE_CREATED),
    },
  },
};


(async () => {
    const app = express();
    const httpServer = createServer(app);

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const server = new ApolloServer({
        schema
    });

    await server.start()

    server.applyMiddleware({ app, path: '/graphql' });

    app.get("/playground", expressPlayground({
        endpoint: '/graphql',
    }));

    httpServer.listen({ port: 8000 }, () => {
        const ws_server = new ws.Server({
            server: httpServer,
            path: '/graphql',
        });

        useServer(
            { schema },
            ws_server
        );

        console.log('Apollo Server on http://localhost:8000/graphql');
    });

    let id = 2;

    setInterval(() => {
        pubSub.publish(MESSAGE_CREATED, {
            messageCreated: { id, content: new Date().toString() },
        });

        id++;
    }, 1000);
})();
