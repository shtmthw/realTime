import type { ApolloClient } from '@apollo/client';
import {
  CONVERSATIONS,
  CONVERSATION_FIELDS,
  MESSAGES,
  type Conversation,
  type Message,
} from './gql';

type AnyClient = ApolloClient<object>;

/** Adds a message to a conversation's cached history (no-op if it isn't loaded or already there). */
export function appendMessage(client: AnyClient, message: Message) {
  client.cache.updateQuery(
    { query: MESSAGES, variables: { conversationId: message.conversationId } },
    (data) => {
      if (!data) return undefined; // history not loaded yet: opening the chat will fetch it
      if (data.messages.messages.some((m) => m.id === message.id)) return data;
      return { messages: { ...data.messages, messages: [...data.messages.messages, message] } };
    },
  );
}

/** Writes the latest version of a conversation and makes sure it is in the sidebar list. */
export function upsertConversation(client: AnyClient, conversation: Conversation) {
  client.cache.writeFragment({
    id: client.cache.identify({ __typename: 'Conversation', id: conversation.id }),
    fragment: CONVERSATION_FIELDS,
    fragmentName: 'ConversationFields',
    data: conversation,
  });
  client.cache.updateQuery({ query: CONVERSATIONS }, (data) => {
    if (!data) return undefined;
    if (data.conversations.some((c) => c.id === conversation.id)) return data;
    return { conversations: [conversation, ...data.conversations] };
  });
}

export function removeConversation(client: AnyClient, id: string) {
  client.cache.updateQuery({ query: CONVERSATIONS }, (data) =>
    data ? { conversations: data.conversations.filter((c) => c.id !== id) } : undefined,
  );
  client.cache.evict({ id: client.cache.identify({ __typename: 'Conversation', id }) });
  client.cache.evict({ fieldName: 'messages', args: { conversationId: id } });
  client.cache.gc();
}
