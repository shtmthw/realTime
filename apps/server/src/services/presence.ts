import { prisma } from '../db.js';
import { publishToUsers } from '../pubsub.js';

// Online state is tracked per process by counting open subscription sockets per user.
// (A multi-instance deployment would need a shared store such as Redis.)
const connections = new Map<string, number>();

export const isOnline = (userId: string) => (connections.get(userId) ?? 0) > 0;

async function peersOf(userId: string): Promise<string[]> {
  const rows = await prisma.conversationMember.findMany({
    where: { userId: { not: userId }, conversation: { members: { some: { userId } } } },
    select: { userId: true },
    distinct: ['userId'],
  });
  return rows.map((r) => r.userId);
}

async function broadcast(userId: string, online: boolean, lastSeenAt: Date) {
  const peers = await peersOf(userId);
  publishToUsers(peers, { __typename: 'PresenceChanged', userId, online, lastSeenAt });
}

export async function userConnected(userId: string): Promise<void> {
  const n = connections.get(userId) ?? 0;
  connections.set(userId, n + 1);
  if (n === 0) await broadcast(userId, true, new Date());
}

export async function userDisconnected(userId: string): Promise<void> {
  const n = connections.get(userId) ?? 0;
  if (n > 1) {
    connections.set(userId, n - 1);
    return;
  }
  connections.delete(userId);
  const lastSeenAt = new Date();
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } }).catch(() => undefined);
  await broadcast(userId, false, lastSeenAt);
}
