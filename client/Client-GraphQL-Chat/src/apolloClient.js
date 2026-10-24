import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// In Docker the nginx container proxies /graphql to the API, so the default is
// same-origin. Local `npm run dev` uses the Vite proxy configured in
// vite.config.js.
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || '/graphql',
});

// Always read the token at request time: logging in/out does not recreate the
// Apollo client, and a missing token must send no Authorization header at all.
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const AUTH_ERROR = /log ?in|unauthori[sz]ed|not authenticated|invalid token|jwt|expired/i;

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const message = graphQLErrors?.map((e) => e.message).join(' ') || '';
  const isAuthError =
    AUTH_ERROR.test(message) || networkError?.statusCode === 401;

  if (isAuthError && localStorage.getItem('token')) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('tokenchange'));
  }
});

const client = new ApolloClient({
  link: from([authLink, errorLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
