import 'dotenv/config';
import { ApolloServer } from 'apollo-server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { verifyToken } from './lib/auth.js';
import { typeDefs } from './gqlControls/typeDefs.js';
import { resolvers } from './gqlControls/resolvers.js';

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
  context: async ({ req }) => verifyToken(req.headers.authorization),
});

const PORT = process.env.PORT || 4000;

server.listen({ port: PORT }).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
