import type { User } from '@prisma/client';
import { requireUser, type Context } from './context.js';
import { signSession } from './auth.js';
import { fail } from './errors.js';
import { pubsub, userTopic } from './pubsub.js';
import * as conversations from './services/conversations.js';
import * as messages from './services/messages.js';
import { isOnline } from './services/presence.js';
import * as users from './services/users.js';
import type { MessageWithSender, ServerEvent } from './types.js';

const iso = (d: Date) => d.toISOString();

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) =>
      ctx.userId ? users.getUser(ctx.userId) : null,
    conversations: (_: unknown, __: unknown, ctx: Context) =>
      conversations.listConversations(requireUser(ctx)),
    conversation: (_: unknown, { id }: { id: string }, ctx: Context) =>
      conversations.getConversation(requireUser(ctx), id),
    messages: (
      _: unknown,
      args: { conversationId: string; before?: string | null; limit?: number | null },
      ctx: Context,
    ) => messages.listMessages(requireUser(ctx), args.conversationId, args.before, args.limit),
    searchUsers: (_: unknown, { query }: { query: string }, ctx: Context) =>
      users.searchUsers(requireUser(ctx), query),
  },

  Mutation: {
    signUp: async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
      const user = await users.signUp(input);
      ctx.session.token = await signSession(user.id);
      return user;
    },
    signIn: async (
      _: unknown,
      { input }: { input: { identifier: string; password: string } },
      ctx: Context,
    ) => {
      const user = await users.signIn(input, ctx.ip);
      ctx.session.token = await signSession(user.id);
      return user;
    },
    signOut: (_: unknown, __: unknown, ctx: Context) => {
      ctx.session.token = null;
      return true;
    },
    updateProfile: (_: unknown, { input }: { input: unknown }, ctx: Context) =>
      users.updateProfile(requireUser(ctx), input),

    startDirect: (_: unknown, { username }: { username: string }, ctx: Context) =>
      conversations.startDirect(requireUser(ctx), username),
    createGroup: (_: unknown, args: { name: string; usernames: string[] }, ctx: Context) =>
      conversations.createGroup(requireUser(ctx), args.name, args.usernames),
    addMembers: (_: unknown, args: { conversationId: string; usernames: string[] }, ctx: Context) =>
      conversations.addMembers(requireUser(ctx), args.conversationId, args.usernames),
    renameGroup: (_: unknown, args: { conversationId: string; name: string }, ctx: Context) =>
      conversations.renameGroup(requireUser(ctx), args.conversationId, args.name),
    leaveGroup: (_: unknown, { conversationId }: { conversationId: string }, ctx: Context) =>
      conversations.leaveGroup(requireUser(ctx), conversationId),

    sendMessage: (_: unknown, args: { conversationId: string; body: string }, ctx: Context) =>
      messages.sendMessage(requireUser(ctx), args.conversationId, args.body),
    markRead: (_: unknown, { conversationId }: { conversationId: string }, ctx: Context) =>
      conversations.markRead(requireUser(ctx), conversationId),
    setTyping: (_: unknown, { conversationId }: { conversationId: string }, ctx: Context) =>
      messages.setTyping(requireUser(ctx), conversationId),
  },

  Subscription: {
    events: {
      subscribe: (_: unknown, __: unknown, ctx: Context) => {
        if (!ctx.userId) throw fail('UNAUTHENTICATED', 'Please sign in to continue');
        return pubsub.subscribe(userTopic(ctx.userId));
      },
      resolve: (event: ServerEvent) => event,
    },
  },

  ChatEvent: {
    __resolveType: (event: ServerEvent) => event.__typename,
  },

  ConversationUpdated: {
    // Resolved per subscriber so titles / unread counts are always from their point of view.
    conversation: (event: { conversationId: string }, _: unknown, ctx: Context) =>
      ctx.userId ? conversations.getConversation(ctx.userId, event.conversationId) : null,
  },

  PresenceChanged: { lastSeenAt: (e: { lastSeenAt: Date }) => iso(e.lastSeenAt) },

  User: {
    online: (u: User) => isOnline(u.id),
    lastSeenAt: (u: User) => iso(u.lastSeenAt),
  },

  Conversation: {
    lastMessageAt: (c: conversations.ConversationView) => iso(c.lastMessageAt),
    createdAt: (c: conversations.ConversationView) => iso(c.createdAt),
  },

  Message: {
    createdAt: (m: MessageWithSender) => iso(m.createdAt),
  },
};
