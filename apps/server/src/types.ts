import type { Message, User } from '@prisma/client';

export type MessageWithSender = Message & { sender: User };

export type ServerEvent =
  | { __typename: 'MessageAdded'; conversationId: string; message: MessageWithSender }
  | { __typename: 'ConversationUpdated'; conversationId: string }
  | { __typename: 'TypingStarted'; conversationId: string; user: User }
  | { __typename: 'PresenceChanged'; userId: string; online: boolean; lastSeenAt: Date };
