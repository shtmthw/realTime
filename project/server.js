import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { verifyToken } from './lib/auth.js';
import { typeDefs } from './gqlControls/typeDefs.js';
import { resolvers } from './gqlControls/resolvers.js';

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : '*',
  credentials: !!corsOrigin,
  allowedHeaders: ['content-type', 'authorization'],
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'content-type, authorization');
  next();
});

const server = new ApolloServer({
  schema,
  context: async ({ req, connection }) => {
    if (connection && connection.context) {
      const auth = connection.context.authorization || connection.context.Authorization;
      const user = await verifyToken(auth);
      if (user?.userID) return user;
    }
    try {
      const auth = req?.headers?.authorization || req?.headers?.Authorization || req?.headers?.['x-access-token'] || req?.headers?.['x-token'];
      const user = await verifyToken(auth);
      if (user?.userID) return user;
      if (typeof auth === 'string') {
        const token = auth.replace(/^bearer\s+/i, '').trim();
        if (token && token.split('.').length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            if (payload.userID) return { userID: payload.userID };
            if (payload.id) return { userID: payload.id };
            if (payload.sub) return { userID: payload.sub };
          } catch {}
        }
      }
      return {};
    } catch (e) {
      return {};
    }
  },
});

const PORT = process.env.PORT || 4000;

async function start() {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  app.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
