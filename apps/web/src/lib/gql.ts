import { gql, type TypedDocumentNode } from '@apollo/client';

// ---- Types (mirror apps/server/src/schema.ts) ----
export interface User {
  __typename?: 'User';
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  online: boolean;
  lastSeenAt: string;
}
export interface Viewer {
  __typename?: 'Viewer';
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarColor: string;
}
export interface Message {
  __typename?: 'Message';
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  sender: User;
}
export interface Conversation {
  __typename?: 'Conversation';
  id: string;
  type: 'DIRECT' | 'GROUP';
  title: string;
  name: string | null;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  peer: User | null;
  members: User[];
  lastMessage: Message | null;
}
export interface MessagePage {
  __typename?: 'MessagePage';
  messages: Message[];
  hasMore: boolean;
}

export type ChatEvent =
  | { __typename: 'MessageAdded'; conversationId: string; message: Message }
  | { __typename: 'ConversationUpdated'; conversationId: string; conversation: Conversation | null }
  | { __typename: 'TypingStarted'; conversationId: string; user: User }
  | { __typename: 'PresenceChanged'; userId: string; online: boolean; lastSeenAt: string };

type Doc<D, V = Record<string, never>> = TypedDocumentNode<D, V>;

// ---- Fragments ----
const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    username
    displayName
    avatarColor
    online
    lastSeenAt
  }
`;
export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id
    conversationId
    body
    createdAt
    sender {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
export const CONVERSATION_FIELDS = gql`
  fragment ConversationFields on Conversation {
    id
    type
    title
    name
    unreadCount
    lastMessageAt
    createdAt
    peer {
      ...UserFields
    }
    members {
      ...UserFields
    }
    lastMessage {
      ...MessageFields
    }
  }
  ${USER_FIELDS}
  ${MESSAGE_FIELDS}
`;
const VIEWER_FIELDS = gql`
  fragment ViewerFields on Viewer {
    id
    username
    displayName
    email
    avatarColor
  }
`;

// ---- Queries ----
export const ME: Doc<{ me: Viewer | null }> = gql`
  query Me {
    me {
      ...ViewerFields
    }
  }
  ${VIEWER_FIELDS}
`;

export const CONVERSATIONS: Doc<{ conversations: Conversation[] }> = gql`
  query Conversations {
    conversations {
      ...ConversationFields
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const MESSAGES: Doc<
  { messages: MessagePage },
  { conversationId: string; before?: string | null; limit?: number }
> = gql`
  query Messages($conversationId: ID!, $before: ID, $limit: Int) {
    messages(conversationId: $conversationId, before: $before, limit: $limit) {
      hasMore
      messages {
        ...MessageFields
      }
    }
  }
  ${MESSAGE_FIELDS}
`;

export const SEARCH_USERS: Doc<{ searchUsers: User[] }, { query: string }> = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

// ---- Mutations ----
export const SIGN_UP: Doc<
  { signUp: Viewer },
  { input: { username: string; email: string; password: string; displayName?: string } }
> = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      ...ViewerFields
    }
  }
  ${VIEWER_FIELDS}
`;

export const SIGN_IN: Doc<{ signIn: Viewer }, { input: { identifier: string; password: string } }> =
  gql`
    mutation SignIn($input: SignInInput!) {
      signIn(input: $input) {
        ...ViewerFields
      }
    }
    ${VIEWER_FIELDS}
  `;

export const SIGN_OUT: Doc<{ signOut: boolean }> = gql`
  mutation SignOut {
    signOut
  }
`;

export const UPDATE_PROFILE: Doc<
  { updateProfile: Viewer },
  { input: { displayName: string; avatarColor: string } }
> = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      ...ViewerFields
    }
  }
  ${VIEWER_FIELDS}
`;

export const START_DIRECT: Doc<{ startDirect: Conversation }, { username: string }> = gql`
  mutation StartDirect($username: String!) {
    startDirect(username: $username) {
      ...ConversationFields
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const CREATE_GROUP: Doc<
  { createGroup: Conversation },
  { name: string; usernames: string[] }
> = gql`
  mutation CreateGroup($name: String!, $usernames: [String!]!) {
    createGroup(name: $name, usernames: $usernames) {
      ...ConversationFields
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const ADD_MEMBERS: Doc<
  { addMembers: Conversation },
  { conversationId: string; usernames: string[] }
> = gql`
  mutation AddMembers($conversationId: ID!, $usernames: [String!]!) {
    addMembers(conversationId: $conversationId, usernames: $usernames) {
      ...ConversationFields
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const RENAME_GROUP: Doc<
  { renameGroup: Conversation },
  { conversationId: string; name: string }
> = gql`
  mutation RenameGroup($conversationId: ID!, $name: String!) {
    renameGroup(conversationId: $conversationId, name: $name) {
      ...ConversationFields
    }
  }
  ${CONVERSATION_FIELDS}
`;

export const LEAVE_GROUP: Doc<{ leaveGroup: boolean }, { conversationId: string }> = gql`
  mutation LeaveGroup($conversationId: ID!) {
    leaveGroup(conversationId: $conversationId)
  }
`;

export const SEND_MESSAGE: Doc<{ sendMessage: Message }, { conversationId: string; body: string }> =
  gql`
    mutation SendMessage($conversationId: ID!, $body: String!) {
      sendMessage(conversationId: $conversationId, body: $body) {
        ...MessageFields
      }
    }
    ${MESSAGE_FIELDS}
  `;

export const MARK_READ: Doc<{ markRead: Conversation }, { conversationId: string }> = gql`
  mutation MarkRead($conversationId: ID!) {
    markRead(conversationId: $conversationId) {
      id
      unreadCount
    }
  }
`;

export const SET_TYPING: Doc<{ setTyping: boolean }, { conversationId: string }> = gql`
  mutation SetTyping($conversationId: ID!) {
    setTyping(conversationId: $conversationId)
  }
`;

// ---- Subscription ----
export const EVENTS: Doc<{ events: ChatEvent }> = gql`
  subscription Events {
    events {
      __typename
      ... on MessageAdded {
        conversationId
        message {
          ...MessageFields
        }
      }
      ... on ConversationUpdated {
        conversationId
        conversation {
          ...ConversationFields
        }
      }
      ... on TypingStarted {
        conversationId
        user {
          ...UserFields
        }
      }
      ... on PresenceChanged {
        userId
        online
        lastSeenAt
      }
    }
  }
  ${CONVERSATION_FIELDS}
`;
