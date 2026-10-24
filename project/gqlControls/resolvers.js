import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signToken } from '../lib/auth.js';

const prisma = new PrismaClient();

const toISO = (date) => (date ? new Date(date).toISOString() : null);

const formatMessage = (m) => ({
  id: m.id.toString(),
  text: m.text,
  senderID: m.senderID.toString(),
  senderName: m.sender?.name ?? null,
  receiverID: m.receiverID ? m.receiverID.toString() : null,
  groupID: m.groupID ? m.groupID.toString() : null,
  createdAt: toISO(m.createdAt),
});

const formatUser = (u) => ({
  id: u.id.toString(),
  name: u.name,
  email: u.email,
  createdAt: toISO(u.createdAt),
});

const formatGroup = (g) => ({
  id: g.id.toString(),
  name: g.name,
  creatorId: g.creatorId.toString(),
  memberCount: g._count?.members ?? g.memberCount ?? 0,
  createdAt: toISO(g.createdAt),
});

const formatFriendRequest = (fr) => ({
  id: fr.id.toString(),
  senderId: fr.senderId.toString(),
  receiverId: fr.receiverId.toString(),
  senderName: fr.sender?.name ?? null,
  receiverName: fr.receiver?.name ?? null,
  status: fr.status,
  createdAt: toISO(fr.createdAt),
});

const requireUser = (ctx) => {
  const id = Number(ctx?.userID ?? ctx?.id ?? ctx?.sub);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('You need to log in to continue');
  }
  return id;
};

// Users you can DM: saved conversations plus anyone you have exchanged a
// direct message with. Group messages (no receiverID) are excluded.
const getConversationUserIds = async (userID) => {
  const [conversations, directMessages] = await Promise.all([
    prisma.directConversation.findMany({
      where: { OR: [{ userAId: userID }, { userBId: userID }] },
      select: { userAId: true, userBId: true },
    }),
    prisma.messages.findMany({
      where: {
        receiverID: { not: null },
        OR: [{ senderID: userID }, { receiverID: userID }],
      },
      select: { senderID: true, receiverID: true },
    }),
  ]);

  const ids = new Set();
  for (const row of conversations) {
    ids.add(row.userAId);
    ids.add(row.userBId);
  }
  for (const row of directMessages) {
    if (row.senderID != null) ids.add(row.senderID);
    if (row.receiverID != null) ids.add(row.receiverID);
  }
  ids.delete(userID);
  return [...ids];
};

const getConversationUsers = async (userID) => {
  const ids = await getConversationUserIds(userID);
  if (ids.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { name: 'asc' },
  });
  return users.map(formatUser);
};

const saveConversation = async (userID, otherID) => {
  const [userAId, userBId] =
    otherID < userID ? [otherID, userID] : [userID, otherID];
  try {
    await prisma.directConversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });
  } catch (err) {
    // Two simultaneous requests can race on the unique pair; that's fine.
    if (err?.code !== 'P2002') throw err;
  }
};

export const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      const userID = requireUser(ctx);
      const user = await prisma.user.findUnique({ where: { id: userID } });
      return user ? formatUser(user) : null;
    },

    users: async (_, __, ctx) => {
      const userID = requireUser(ctx);
      return getConversationUsers(userID);
    },

    user: async (_, { ID }) => {
      const user = await prisma.user.findUnique({
        where: { id: Number(ID) },
      });
      if (!user) return null;
      return formatUser(user);
    },

    getConversations: async (_, __, ctx) => {
      const userID = requireUser(ctx);
      return getConversationUsers(userID);
    },

    findUserByUsername: async (_, { username }, ctx) => {
      requireUser(ctx);
      const name = (username || '').trim();
      if (!name) {
        throw new Error('Enter a username');
      }
      const matches = await prisma.user.findMany({ where: { name } });
      if (matches.length === 0) return null;
      if (matches.length > 1) {
        throw new Error(
          'More than one user has that name. Ask them to make their display name unique.'
        );
      }
      return formatUser(matches[0]);
    },

    getPersonalMessages: async (_, { receiverID }, ctx) => {
      const userID = requireUser(ctx);
      if (!receiverID) {
        throw new Error('Receiver ID not given');
      }
      const receiverId = Number(receiverID);
      const messages = await prisma.messages.findMany({
        where: {
          OR: [
            { receiverID: receiverId, senderID: userID },
            { senderID: receiverId, receiverID: userID },
          ],
        },
        orderBy: { createdAt: 'asc' },
        include: { sender: true },
      });
      return messages.map(formatMessage);
    },

    getGroups: async (_, __, ctx) => {
      const userID = requireUser(ctx);
      const groups = await prisma.group.findMany({
        where: { members: { some: { userId: userID } } },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return groups.map(formatGroup);
    },

    getGroup: async (_, { ID }, ctx) => {
      const userID = requireUser(ctx);
      const group = await prisma.group.findUnique({
        where: { id: Number(ID) },
        include: { _count: { select: { members: true } } },
      });
      if (!group) throw new Error('Group not found');
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: userID, groupId: group.id },
        },
      });
      if (!membership) throw new Error('Not a member of this group');
      return formatGroup(group);
    },

    getFriendRequests: async (_, __, ctx) => {
      const userID = requireUser(ctx);
      const requests = await prisma.friendRequest.findMany({
        where: { receiverId: userID },
        include: { sender: true, receiver: true },
        orderBy: { createdAt: 'desc' },
      });
      return requests.map(formatFriendRequest);
    },

    getGroupMessages: async (_, { groupID }, ctx) => {
      const userID = requireUser(ctx);
      if (!groupID) {
        throw new Error('Group ID not given');
      }
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: userID, groupId: Number(groupID) },
        },
      });
      if (!membership) {
        throw new Error('Not a member of this group');
      }
      const messages = await prisma.messages.findMany({
        where: { groupID: Number(groupID) },
        orderBy: { createdAt: 'asc' },
        include: { sender: true },
      });
      return messages.map(formatMessage);
    },
  },

  Mutation: {
    createMessage: async (_, { newMsg }, ctx) => {
      const userID = requireUser(ctx);
      if (!newMsg.text || newMsg.text.trim().length < 1) {
        throw new Error("Message can't be empty");
      }
      if (!newMsg.receiverID) {
        throw new Error('Receiver is required');
      }
      const receiverID = Number(newMsg.receiverID);
      if (receiverID === userID) {
        throw new Error("You can't message yourself");
      }
      const receiver = await prisma.user.findUnique({
        where: { id: receiverID },
      });
      if (!receiver) {
        throw new Error('User not found');
      }

      const message = await prisma.messages.create({
        data: {
          text: newMsg.text.trim(),
          senderID: userID,
          receiverID,
        },
        include: { sender: true },
      });

      // A sent DM keeps the conversation in both users' Direct Messages list.
      await saveConversation(userID, receiverID);

      return formatMessage(message);
    },

    createGroupMessage: async (_, { newMsg }, ctx) => {
      const userID = requireUser(ctx);
      if (!newMsg.text || newMsg.text.trim().length < 1) {
        throw new Error("Message can't be empty");
      }
      if (!newMsg.groupID) {
        throw new Error('Group ID is required');
      }
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: { userId: userID, groupId: Number(newMsg.groupID) },
        },
      });
      if (!membership) {
        throw new Error('Not a member of this group');
      }
      const message = await prisma.messages.create({
        data: {
          text: newMsg.text.trim(),
          senderID: userID,
          groupID: Number(newMsg.groupID),
        },
        include: { sender: true },
      });
      return formatMessage(message);
    },

    createNewUser: async (_, { newUser }) => {
      const name = newUser.name?.trim();
      const email = newUser.email?.trim();
      if (!name || !email || !newUser.password) {
        throw new Error('Please fill the required fields');
      }
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new Error('User already exists');
      }
      const hashedPassword = await bcrypt.hash(newUser.password, 10);
      const createdUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });
      return formatUser(createdUser);
    },

    createSimpleUser: async (_, { newUser }) => {
      const name = newUser.name?.trim();
      if (!name) throw new Error('Name is required');
      const email = `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new Error('User already exists');
      }
      const createdUser = await prisma.user.create({
        data: {
          name,
          email,
          password: await bcrypt.hash('default-password-change-me', 10),
        },
      });
      return formatUser(createdUser);
    },

    loginUser: async (_, { userInfo }) => {
      if (!userInfo.email || !userInfo.password) {
        throw new Error('Please fill the required fields');
      }
      const userExist = await prisma.user.findUnique({
        where: { email: userInfo.email.trim() },
      });
      if (!userExist) {
        throw new Error('Email or password incorrect');
      }
      const comparedPass = await bcrypt.compare(
        userInfo.password,
        userExist.password
      );
      if (!comparedPass) {
        throw new Error('Email or password incorrect');
      }
      const token = await signToken(userExist.id);
      return { name: userExist.name, token };
    },

    addConversation: async (_, { username }, ctx) => {
      const userID = requireUser(ctx);
      const name = (username || '').trim();
      if (!name) {
        throw new Error('Enter a username');
      }

      // The schema uses a case-insensitive collation, so this matches
      // "Alice", "alice" and "ALICE" alike.
      const matches = await prisma.user.findMany({ where: { name } });
      if (matches.length === 0) {
        throw new Error(`No user found with the username "${name}"`);
      }
      if (matches.length > 1) {
        throw new Error(
          'More than one user has that name. Ask them to change their display name so it is unique.'
        );
      }

      const other = matches[0];
      if (other.id === userID) {
        throw new Error("You can't start a chat with yourself");
      }

      await saveConversation(userID, other.id);
      return formatUser(other);
    },

    createGroup: async (_, { newGroup }, ctx) => {
      const userID = requireUser(ctx);
      const name = newGroup.name?.trim();
      if (!name) {
        throw new Error('Group name is required');
      }

      const requested = Array.isArray(newGroup.memberIds)
        ? newGroup.memberIds
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];
      const memberIds = Array.from(new Set([...requested, userID]));
      if (memberIds.length < 2) {
        throw new Error('Select at least one other member');
      }

      const members = await prisma.user.findMany({
        where: { id: { in: memberIds } },
      });
      if (members.length !== memberIds.length) {
        throw new Error('One or more members do not exist');
      }

      const group = await prisma.group.create({
        data: {
          name,
          creatorId: userID,
          members: {
            create: memberIds.map((id) => ({ userId: id })),
          },
        },
        include: { _count: { select: { members: true } } },
      });
      return formatGroup(group);
    },

    addGroupMembers: async (_, { groupID, memberIds }, ctx) => {
      const userID = requireUser(ctx);
      const groupId = Number(groupID);
      if (!Number.isInteger(groupId) || groupId <= 0) {
        throw new Error('Group not found');
      }

      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) throw new Error('Group not found');

      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: userID, groupId } },
      });
      if (!membership) throw new Error('Not a member of this group');

      const ids = Array.from(
        new Set(
          (Array.isArray(memberIds) ? memberIds : [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      );
      if (ids.length === 0) throw new Error('Select at least one person');

      const users = await prisma.user.findMany({ where: { id: { in: ids } } });
      if (users.length !== ids.length) {
        throw new Error('One or more users do not exist');
      }

      const existing = await prisma.groupMember.findMany({
        where: { groupId, userId: { in: ids } },
        select: { userId: true },
      });
      const existingIds = new Set(existing.map((row) => row.userId));
      const newIds = ids.filter((id) => !existingIds.has(id));
      if (newIds.length === 0) {
        throw new Error('That person is already in this group');
      }

      await prisma.groupMember.createMany({
        data: newIds.map((id) => ({ groupId, userId: id })),
      });

      const updated = await prisma.group.findUnique({
        where: { id: groupId },
        include: { _count: { select: { members: true } } },
      });
      return formatGroup(updated);
    },

    sendFriendRequest: async (_, { input }, ctx) => {
      const userID = requireUser(ctx);
      if (!input.receiverId) {
        throw new Error('Receiver ID is required');
      }
      const receiverId = Number(input.receiverId);
      if (receiverId === userID) {
        throw new Error('Cannot send friend request to yourself');
      }
      const receiverExists = await prisma.user.findUnique({
        where: { id: receiverId },
      });
      if (!receiverExists) {
        throw new Error('User not found');
      }
      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          senderId: userID,
          receiverId: receiverId,
        },
      });
      if (existingRequest) {
        throw new Error('Friend request already sent');
      }
      const request = await prisma.friendRequest.create({
        data: {
          senderId: userID,
          receiverId: receiverId,
          status: 'pending',
        },
        include: { sender: true, receiver: true },
      });
      return formatFriendRequest(request);
    },
  },
};
