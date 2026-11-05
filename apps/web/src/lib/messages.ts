import { formatDayLabel } from './time';

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string; avatarColor: string };
}

export type TimelineItem =
  | { kind: 'day'; key: string; label: string }
  | {
      kind: 'run';
      key: string;
      mine: boolean;
      sender: ChatMessage['sender'];
      messages: ChatMessage[];
    };

const RUN_GAP_MS = 5 * 60 * 1000;

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * Turns a flat, oldest → newest message list into a timeline of day separators and runs of
 * consecutive messages from the same sender (broken by a pause of 5+ minutes or a new day).
 */
export function buildTimeline(
  messages: ChatMessage[],
  viewerId: string,
  now = new Date(),
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let lastDay = '';
  let current: Extract<TimelineItem, { kind: 'run' }> | null = null;
  let lastTime = 0;

  for (const message of messages) {
    const day = dayKey(message.createdAt);
    const time = new Date(message.createdAt).getTime();
    if (day !== lastDay) {
      items.push({ kind: 'day', key: `day-${day}`, label: formatDayLabel(message.createdAt, now) });
      lastDay = day;
      current = null;
    }
    if (!current || current.sender.id !== message.sender.id || time - lastTime > RUN_GAP_MS) {
      current = {
        kind: 'run',
        key: `run-${message.id}`,
        mine: message.sender.id === viewerId,
        sender: message.sender,
        messages: [],
      };
      items.push(current);
    }
    current.messages.push(message);
    lastTime = time;
  }
  return items;
}
