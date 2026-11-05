import { Prisma, type Conversation, type ConversationMember, type User } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { fail, parseInput } from '../errors.js';
import { publishToUsers } from '../pubsub.js';
import type { MessageWithSender } from '../types.js';

export interface ConversationView {
  id: string;
  type: Conversation['type'];
  name: string | null;
  title: string;
  members: User[];
  peer: User | null;
  lastMessage: MessageWithSender | null;
  lastMessageAt: Date;
  unreadCount: number;
  createdAt: Date;
}

const groupNameSchema = z
  .string({ required_error: 'Give the group a name' })
  .trim()
  .min(1, 'Give the group a name')
  .max(60, 'Group name is too long');
const usernamesSchema = z
  .array(z.string().trim().toLowerCase().min(1))
  .min(1, 'Pick at least one person')
  .max(99, 'That’s too many people at once');

const include = {
  members: { include: { user: true }, orderBy: { joinedAt: 'asc' } },
  messages: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
    include: { sender: true },
  },
} satisfies Prisma.ConversationInclude;

type Row = Prisma.ConversationGetPayload<{ include: typeof include }>;

async function toView(userId: string, row: Row): Promise<ConversationView> {
  const me: ConversationMember | undefined = row.members.find((m) => m.userId === userId);
  const unreadCount = me
    ? await prisma.message.count({
        where: {
          conversationId: row.id,
          senderId: { not: userId },
          createdAt: { gt: me.lastReadAt },
        },
      })
    : 0;
  const members = row.members.map((m) => m.user);
  const peer = row.type === 'DIRECT' ? (members.find((u) => u.id !== userId) ?? null) : null;
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    title: row.type === 'DIRECT' ? (peer?.displayName ?? 'Deleted user') : (row.name ?? 'Group'),
    members,
    peer,
    lastMessage: row.messages[0] ?? null,
    lastMessageAt: row.lastMessageAt,
    unreadCount,
    createdAt: row.createdAt,
  };
}

/** Throws NOT_FOUND unless `userId` belongs to the conversation (never reveals that it exists). */
export async function requireMember(
  userId: string,
  conversationId: string,
): Promise<ConversationMember> {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw fail('NOT_FOUND', 'Conversation not found');
  return member;
}

export async function memberIds(conversationId: string): Promise<string[]> {
  const rows = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function listConversations(userId: string): Promise<ConversationView[]> {
  const rows = await prisma.conversation.findMany({
    where: { members: { some: { userId } } },
    orderBy: { lastMessageAt: 'desc' },
    include,
  });
  return Promise.all(rows.map((r) => toView(userId, r)));
}

/** Returns null when the user is not a member (used by realtime events after leaving a group). */
export async function getConversation(
  userId: string,
  id: string,
): Promise<ConversationView | null> {
  const row = await prisma.conversation.findFirst({
    where: { id, members: { some: { userId } } },
    include,
  });
  return row ? toView(userId, row) : null;
}

async function requireView(userId: string, id: string): Promise<ConversationView> {
  const view = await getConversation(userId, id);
  if (!view) throw fail('NOT_FOUND', 'Conversation not found');
  return view;
}

async function usersByUsername(usernames: string[]): Promise<User[]> {
  const unique = [...new Set(usernames)];
  const users = await prisma.user.findMany({ where: { username: { in: unique } } });
  const found = new Set(users.map((u) => u.username));
  const missing = unique.find((u) => !found.has(u));
  if (missing) throw fail('NOT_FOUND', `No one is using the username “${missing}”`);
  return users;
}

const notify = (ids: Iterable<string>, conversationId: string) =>
  publishToUsers(ids, { __typename: 'ConversationUpdated', conversationId });

export async function startDirect(userId: string, username: string): Promise<ConversationView> {
  const handle = username.trim().toLowerCase().replace(/^@/, '');
  if (!handle) throw fail('BAD_USER_INPUT', 'Enter a username', { field: 'username' });
  const other = await prisma.user.findUnique({ where: { username: handle } });
  if (!other) throw fail('NOT_FOUND', `No one is using the username “${handle}”`);
  if (other.id === userId) throw fail('BAD_USER_INPUT', 'You can’t start a chat with yourself');

  const directKey = [userId, other.id].sort().join(':');
  let conversation = await prisma.conversation.findUnique({ where: { directKey } });
  let created = false;
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey,
          createdById: userId,
          members: { create: [{ userId }, { userId: other.id }] },
        },
      });
      created = true;
    } catch (err) {
      // Both people started the chat at the same moment: the unique key picked a winner.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        conversation = await prisma.conversation.findUnique({ where: { directKey } });
      } else throw err;
    }
  }
  if (!conversation) throw fail('NOT_FOUND', 'Conversation not found');
  if (created) notify([userId, other.id], conversation.id);
  return requireView(userId, conversation.id);
}

export async function createGroup(
  userId: string,
  name: unknown,
  usernames: unknown,
): Promise<ConversationView> {
  const groupName = parseInput(groupNameSchema, name, 'name');
  const handles = parseInput(usernamesSchema, usernames, 'usernames').map((u) =>
    u.replace(/^@/, ''),
  );
  const users = (await usersByUsername(handles)).filter((u) => u.id !== userId);
  if (users.length === 0)
    throw fail('BAD_USER_INPUT', 'Pick at least one person other than yourself');

  const conversation = await prisma.conversation.create({
    data: {
      type: 'GROUP',
      name: groupName,
      createdById: userId,
      members: {
        create: [{ userId, role: 'OWNER' }, ...users.map((u) => ({ userId: u.id }))],
      },
    },
  });
  notify([userId, ...users.map((u) => u.id)], conversation.id);
  return requireView(userId, conversation.id);
}

async function requireGroup(userId: string, conversationId: string) {
  await requireMember(userId, conversationId);
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
  });
  if (conversation.type !== 'GROUP') throw fail('BAD_USER_INPUT', 'That only works in group chats');
  return conversation;
}

export async function addMembers(
  userId: string,
  conversationId: string,
  usernames: unknown,
): Promise<ConversationView> {
  await requireGroup(userId, conversationId);
  const handles = parseInput(usernamesSchema, usernames, 'usernames').map((u) =>
    u.replace(/^@/, ''),
  );
  const users = await usersByUsername(handles);
  const existing = new Set(await memberIds(conversationId));
  const fresh = users.filter((u) => !existing.has(u.id));
  if (fresh.length === 0) throw fail('CONFLICT', 'They’re already in this group');

  await prisma.conversationMember.createMany({
    data: fresh.map((u) => ({ conversationId, userId: u.id })),
    skipDuplicates: true,
  });
  notify(await memberIds(conversationId), conversationId);
  return requireView(userId, conversationId);
}

export async function renameGroup(
  userId: string,
  conversationId: string,
  name: unknown,
): Promise<ConversationView> {
  await requireGroup(userId, conversationId);
  const groupName = parseInput(groupNameSchema, name, 'name');
  await prisma.conversation.update({ where: { id: conversationId }, data: { name: groupName } });
  notify(await memberIds(conversationId), conversationId);
  return requireView(userId, conversationId);
}

export async function leaveGroup(userId: string, conversationId: string): Promise<boolean> {
  await requireGroup(userId, conversationId);
  await prisma.conversationMember.delete({
    where: { conversationId_userId: { conversationId, userId } },
  });
  const remaining = await prisma.conversationMember.findMany({
    where: { conversationId },
    orderBy: { joinedAt: 'asc' },
  });
  if (remaining.length === 0) {
    await prisma.conversation.delete({ where: { id: conversationId } });
  } else if (!remaining.some((m) => m.role === 'OWNER')) {
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: remaining[0]!.userId } },
      data: { role: 'OWNER' },
    });
  }
  // The leaver is told too, so their other tabs drop the chat.
  notify([userId, ...remaining.map((m) => m.userId)], conversationId);
  return true;
}

export async function markRead(userId: string, conversationId: string): Promise<ConversationView> {
  await requireMember(userId, conversationId);
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
  notify([userId], conversationId); // keeps the viewer's other tabs in sync
  return requireView(userId, conversationId);
}
