import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  split,
  type FieldFunctionOptions,
  type Reference,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setConnectionState } from './connection';
import { ME } from './gql';

interface PageRef {
  hasMore: boolean;
  messages: Reference[];
}

/**
 * Merges pages of a conversation's messages into one list (oldest → newest):
 *  - `before` set: an older page, prepend it
 *  - otherwise: the latest page (first load, reconnect catch-up), merge by id
 */
function mergeMessagePages(
  existing: PageRef | undefined,
  incoming: PageRef,
  { args, readField }: FieldFunctionOptions,
): PageRef {
  if (!existing) return incoming;
  const idOf = (ref: Reference) => readField<string>('id', ref) ?? '';
  const known = new Set(existing.messages.map(idOf));
  const isOlderPage = Boolean(args?.before);

  if (isOlderPage) {
    const fresh = incoming.messages.filter((m) => !known.has(idOf(m)));
    return { hasMore: incoming.hasMore, messages: [...fresh, ...existing.messages] };
  }

  const overlaps = incoming.messages.some((m) => known.has(idOf(m)));
  // More than a page arrived while we weren't looking: keep it simple and start over.
  if (!overlaps && incoming.hasMore && existing.messages.length > 0) return incoming;

  const merged = [...existing.messages, ...incoming.messages.filter((m) => !known.has(idOf(m)))];
  const created = (ref: Reference) => readField<string>('createdAt', ref) ?? '';
  merged.sort((a, b) => created(a).localeCompare(created(b)) || idOf(a).localeCompare(idOf(b)));
  return {
    hasMore: existing.hasMore && incoming.hasMore ? true : existing.hasMore,
    messages: merged,
  };
}

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        messages: { keyArgs: ['conversationId'], merge: mergeMessagePages },
      },
    },
    MessagePage: { keyFields: false },
  },
});

const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

export const wsClient = createClient({
  url: `${wsProtocol}://${location.host}/graphql`,
  lazy: true, // connect only once someone subscribes, i.e. after signing in
  retryAttempts: Infinity,
  keepAlive: 20_000,
  on: {
    connecting: () => setConnectionState('connecting'),
    connected: () => {
      const { reconnected } = setConnectionState('connected');
      // Catch up on anything missed while the socket was down.
      if (reconnected) void client.refetchQueries({ include: ['Conversations', 'Messages'] });
    },
    closed: (event) => {
      const code = (event as CloseEvent | undefined)?.code;
      setConnectionState(code === 1000 ? 'idle' : 'closed');
      // 4401/4403: the server refused our session. Re-check who we are.
      if (code === 4401 || code === 4403) void client.refetchQueries({ include: ['Me'] });
    },
  },
});

const httpLink = new HttpLink({ uri: '/graphql', credentials: 'same-origin' });
const wsLink = new GraphQLWsLink(wsClient);

// If the session expires mid-use, fall back to the sign-in screen.
let resetting = false;
/**
 * Leaves the signed-in state: shows the sign-in screen first, then drops every cached byte of the
 * previous session so the next person on this device never sees it.
 */
export async function resetSession() {
  if (resetting) return;
  resetting = true;
  try {
    client.writeQuery({ query: ME, data: { me: null } });
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the signed-in screens unmount
    await client.resetStore();
  } catch {
    /* the Me query will report the problem */
  } finally {
    resetting = false;
  }
}

const authLink = onError(({ graphQLErrors, operation }) => {
  const unauthenticated = graphQLErrors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
  if (
    unauthenticated &&
    operation.operationName !== 'SignIn' &&
    operation.operationName !== 'SignUp'
  ) {
    void resetSession();
  }
});

const transport = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  httpLink,
);

export const client = new ApolloClient({
  cache,
  link: ApolloLink.from([authLink, transport]),
});
