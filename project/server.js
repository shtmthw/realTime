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

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const server = new ApolloServer({
  schema,
  context: async ({ req }) => {
    const auth =
      req?.headers?.authorization ||
      req?.headers?.['x-access-token'] ||
      req?.headers?.['x-token'];
    const user = await verifyToken(auth);
    return user || {};
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
