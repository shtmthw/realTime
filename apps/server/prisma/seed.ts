// Demo data for local development and README screenshots.
// Safe to run repeatedly: it does nothing if any user already exists.
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth.js';
import { AVATAR_COLORS } from '../src/services/users.js';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

const people = [
  { username: 'alice', displayName: 'Alice Moreno' },
  { username: 'bob', displayName: 'Bob Carter' },
  { username: 'carol', displayName: 'Carol Nakamura' },
  { username: 'dave', displayName: 'Dave Okafor' },
  { username: 'erin', displayName: 'Erin Walsh' },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log('Seed skipped: database already has users.');
    return;
  }
  const passwordHash = await hashPassword(PASSWORD);
  const users: Record<string, string> = {};
  for (const [i, p] of people.entries()) {
    const u = await prisma.user.create({
      data: {
        ...p,
        email: `${p.username}@example.com`,
        passwordHash,
        avatarColor: AVATAR_COLORS[(i * 3) % AVATAR_COLORS.length]!,
      },
    });
    users[p.username] = u.id;
  }
  const id = (name: string) => users[name]!;

  async function chat(
    data: {
      type: 'DIRECT' | 'GROUP';
      name?: string;
      members: string[];
      readUpTo?: Record<string, number>;
    },
    lines: Array<[string, string, number]>, // [sender, text, minutes ago]
  ) {
    const memberIds = data.members.map(id);
    const last = lines.at(-1)?.[2] ?? 0;
    const conv = await prisma.conversation.create({
      data: {
        type: data.type,
        name: data.name,
        directKey: data.type === 'DIRECT' ? [...memberIds].sort().join(':') : null,
        createdById: memberIds[0]!,
        createdAt: minutesAgo(60 * 24 * 3),
        lastMessageAt: minutesAgo(last),
        members: {
          create: memberIds.map((userId, i) => ({
            userId,
            role: i === 0 ? 'OWNER' : 'MEMBER',
            // Members are "read up to" N minutes ago; default: everything is read.
            lastReadAt: minutesAgo(data.readUpTo?.[data.members[i]!] ?? 0),
          })),
        },
      },
    });
    for (const [sender, body, ago] of lines) {
      await prisma.message.create({
        data: { conversationId: conv.id, senderId: id(sender), body, createdAt: minutesAgo(ago) },
      });
    }
  }

  const day = 60 * 24;
  await chat({ type: 'DIRECT', members: ['alice', 'bob'], readUpTo: { alice: 0 } }, [
    ['bob', 'Morning! Did you get a chance to look at the new designs?', day + 190],
    ['alice', 'Yes — I like the simpler sidebar a lot.', day + 185],
    ['bob', 'Great. Shipping the mobile layout today.', day + 180],
    ['alice', 'Hey Bob, how is the mobile layout going?', 42],
    ['bob', 'Pretty well! Messages now arrive instantly instead of polling.', 38],
    ['alice', 'Nice. Does it work when the phone is offline for a bit?', 35],
    ['bob', 'It reconnects on its own and shows a little banner while it does.', 33],
    ['bob', 'Want to try it on your phone?', 32],
    ['alice', 'Absolutely, send me the link 🚀', 6],
  ]);

  await chat(
    {
      type: 'GROUP',
      name: 'Weekend hike 🥾',
      members: ['alice', 'bob', 'carol', 'dave'],
      readUpTo: { alice: 25 },
    },
    [
      ['carol', 'Forecast looks clear for Saturday!', 190],
      ['dave', 'I can drive. Leaving at 7:30?', 120],
      ['bob', '7:30 works for me', 90],
      ['carol', 'Bringing sandwiches for everyone', 28],
      ['dave', 'Legend. I’ll grab the coffee.', 22],
      ['bob', 'Trail map is in the shared folder', 18],
    ],
  );

  await chat({ type: 'DIRECT', members: ['alice', 'carol'], readUpTo: { alice: 0 } }, [
    ['alice', 'Thanks for reviewing the PR!', day * 2 + 30],
    ['carol', 'Anytime. Left two small comments.', day * 2 + 20],
  ]);

  await chat(
    {
      type: 'GROUP',
      name: 'Design crit',
      members: ['erin', 'alice', 'carol'],
      readUpTo: { alice: 0 },
    },
    [
      ['erin', 'Posted the latest mockups in the doc.', day + 400],
      ['carol', 'Love the calmer palette.', day + 380],
    ],
  );

  console.log(
    `Seeded ${people.length} users (password for all: "${PASSWORD}"): ${people.map((p) => p.username).join(', ')}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
