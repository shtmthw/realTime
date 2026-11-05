import { createPubSub } from 'graphql-yoga';
import type { ServerEvent } from './types.js';

export const pubsub = createPubSub<{ [topic: string]: [ServerEvent] }>();

export const userTopic = (userId: string) => `user:${userId}`;

export function publishToUsers(userIds: Iterable<string>, event: ServerEvent): void {
  for (const id of new Set(userIds)) pubsub.publish(userTopic(id), event);
}
