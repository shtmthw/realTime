import { z } from 'zod';
import { prisma } from '../db.js';
import { fail, parseInput } from '../errors.js';
import { publishToUsers } from '../pubsub.js';
import { RateLimiter } from '../rateLimit.js';
import type { MessageWithSender } from '../types.js';
import { memberIds, requireMember } from './conversations.js';

const bodySchema = z
  .string({ required_error: 'Write a message first' })
  .transform((s) => s.trim())
  .pipe(z.string().min(1, 'Write a message first').max(4000, 'Messages can be up to 4000 characters'));

// 30 messages per 10 seconds per user; typing pings are cheaper but still bounded.
export const sendLimiter = new RateLimiter(30, 10_000);
export const typingLimiter = new RateLimiter(20, 10_000);

export interface MessagePage {
  messages: MessageWithSender[];
  hasMore: boolean;
}

export async function listMessages(
  userId: string,
  conversationId: string,
  before: string | null | undefined,
  limit: number | null | undefined,
): Promise<MessagePage> {
  await requireMember(userId, conversationId);
  const take = Math.min(Math.max(limit ?? 30, 1), 100);

  let cursorWhere = {};
  if (before) {
    const anchor = await prisma.message.findFirst({ where: { id: before, conversationId } });
    if (!anchor) throw fail('BAD_USER_INPUT', 'Unknown cursor');
    cursorWhere = {
      OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ],
    };
  }

  const rows = await prisma.message.findMany({
    where: { conversationId, ...cursorWhere },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    include: { sender: true },
  });
  const hasMore = rows.length > take;
  // Newest page first from the DB, returned oldest → newest for rendering.
  return { messages: rows.slice(0, take).reverse(), hasMore };
}

export async function sendMessage(userId: string, conversationId: string, body: unknown): Promise<MessageWithSender> {
  const text = parseInput(bodySchema, body);
  await requireMember(userId, conversationId);
  if (!sendLimiter.allow(userId)) throw fail('RATE_LIMITED', 'You’re sending messages too fast');
  sendLimiter.hit(userId);

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: userId, body: text, createdAt: now },
      include: { sender: true },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    }),
  ]);

  publishToUsers(await memberIds(conversationId), { __typename: 'MessageAdded', conversationId, message });
  return message;
}

export async function setTyping(userId: string, conversationId: string): Promise<boolean> {
  await requireMember(userId, conversationId);
  if (!typingLimiter.allow(userId)) return false;
  typingLimiter.hit(userId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const others = (await memberIds(conversationId)).filter((id) => id !== userId);
  publishToUsers(others, { __typename: 'TypingStarted', conversationId, user });
  return true;
}
