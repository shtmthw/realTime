import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers.js';

export const typeDefs = /* GraphQL */ `
  type Query {
    me: Viewer
    conversations: [Conversation!]!
    conversation(id: ID!): Conversation
    "Messages are returned oldest → newest. Pass the id of the oldest loaded message as \`before\` to page back."
    messages(conversationId: ID!, before: ID, limit: Int = 30): MessagePage!
    searchUsers(query: String!): [User!]!
  }

  type Mutation {
    signUp(input: SignUpInput!): Viewer!
    signIn(input: SignInInput!): Viewer!
    signOut: Boolean!
    updateProfile(input: UpdateProfileInput!): Viewer!

    startDirect(username: String!): Conversation!
    createGroup(name: String!, usernames: [String!]!): Conversation!
    addMembers(conversationId: ID!, usernames: [String!]!): Conversation!
    renameGroup(conversationId: ID!, name: String!): Conversation!
    leaveGroup(conversationId: ID!): Boolean!

    sendMessage(conversationId: ID!, body: String!): Message!
    markRead(conversationId: ID!): Conversation!
    setTyping(conversationId: ID!): Boolean!
  }

  type Subscription {
    "One stream per signed-in user with everything that happens in their conversations."
    events: ChatEvent!
  }

  input SignUpInput {
    username: String!
    email: String!
    password: String!
    displayName: String
  }

  input SignInInput {
    "Username or email"
    identifier: String!
    password: String!
  }

  input UpdateProfileInput {
    displayName: String!
    avatarColor: String!
  }

  "The signed-in user."
  type Viewer {
    id: ID!
    username: String!
    displayName: String!
    email: String!
    avatarColor: String!
  }

  type User {
    id: ID!
    username: String!
    displayName: String!
    avatarColor: String!
    online: Boolean!
    lastSeenAt: String!
  }

  enum ConversationType {
    DIRECT
    GROUP
  }

  type Conversation {
    id: ID!
    type: ConversationType!
    "Display title for the viewer: the other person for DMs, the group name for groups."
    title: String!
    name: String
    members: [User!]!
    "The other person in a direct message."
    peer: User
    lastMessage: Message
    lastMessageAt: String!
    unreadCount: Int!
    createdAt: String!
  }

  type Message {
    id: ID!
    conversationId: ID!
    sender: User!
    body: String!
    createdAt: String!
  }

  type MessagePage {
    messages: [Message!]!
    hasMore: Boolean!
  }

  union ChatEvent = MessageAdded | ConversationUpdated | TypingStarted | PresenceChanged

  type MessageAdded {
    conversationId: ID!
    message: Message!
  }

  "Something about a conversation changed (created, renamed, members, read state). \`conversation\` is null if you are no longer a member."
  type ConversationUpdated {
    conversationId: ID!
    conversation: Conversation
  }

  type TypingStarted {
    conversationId: ID!
    user: User!
  }

  type PresenceChanged {
    userId: ID!
    online: Boolean!
    lastSeenAt: String!
  }
`;

export const schema = makeExecutableSchema({ typeDefs, resolvers });
