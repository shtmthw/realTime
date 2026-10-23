import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/auth.js';

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

export const resolvers = {
  Query: {
    users: async (_, __, ctx) => {
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Login to continue');
      }
      const users = await prisma.user.findMany({
        where: { id: { not: userID } },
        orderBy: { name: 'asc' },
      });
      return users.map(formatUser);
    },

    user: async (_, { ID }) => {
      const user = await prisma.user.findUnique({
        where: { id: Number(ID) },
      });
      if (!user) return null;
      return formatUser(user);
    },

    getPersonalMessages: async (_, { receiverID }, ctx) => {
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Login to continue');
      }
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
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Login to continue');
      }
      const groups = await prisma.group.findMany({
        where: { members: { some: { userId: userID } } },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return groups.map(formatGroup);
    },

    getFriendRequests: async (_, __, { userID }) => {
      if (!userID) {
        throw new Error('Login to continue');
      }
      const requests = await prisma.friendRequest.findMany({
        where: { receiverId: userID },
        include: { sender: true, receiver: true },
        orderBy: { createdAt: 'desc' },
      });
      return requests.map(formatFriendRequest);
    },

    getGroupMessages: async (_, { groupID }, ctx) => {
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Login to continue');
      }
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
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Please login to send a message');
      }
      if (!newMsg.text || newMsg.text.trim().length < 1) {
        throw new Error("Message can't be empty");
      }
      const receiverID = newMsg.receiverID ? Number(newMsg.receiverID) : null;
      const message = await prisma.messages.create({
        data: {
          text: newMsg.text.trim(),
          senderID: userID,
          receiverID,
        },
        include: { sender: true },
      });
      const formatted = formatMessage(message);
      return formatted;
    },

    createGroupMessage: async (_, { newMsg }, ctx) => {
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Please login to send a message');
      }
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
      const formatted = formatMessage(message);
      return formatted;
    },

    createNewUser: async (_, { newUser }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: newUser.email },
      });
      if (existingUser) {
        throw new Error('User already exists');
      }
      const hashedPassword = await bcrypt.hash(newUser.password, 10);
      const createdUser = await prisma.user.create({
        data: {
          name: newUser.name,
          email: newUser.email,
          password: hashedPassword,
        },
      });
      return formatUser(createdUser);
    },

    createSimpleUser: async (_, { newUser }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: `${newUser.name.toLowerCase().replace(/\s+/g, '')}@example.com` },
      });
      if (existingUser) {
        throw new Error('User already exists');
      }
      const createdUser = await prisma.user.create({
        data: {
          name: newUser.name.trim(),
          email: `${newUser.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
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
        where: { email: userInfo.email },
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

    createGroup: async (_, { newGroup }, ctx) => {
      const userID = ctx?.userID || ctx?.id || ctx?.sub;
      if (!userID) {
        throw new Error('Please login to create a group');
      }
      if (!newGroup.name || newGroup.name.trim().length < 1) {
        throw new Error('Group name is required');
      }
      const memberIds = Array.from(
        new Set([...newGroup.memberIds, String(userID)])
      ).map(Number);

      const members = await prisma.user.findMany({
        where: { id: { in: memberIds } },
      });
      if (members.length !== memberIds.length) {
        throw new Error('One or more members do not exist');
      }

      const group = await prisma.group.create({
        data: {
          name: newGroup.name.trim(),
          creatorId: userID,
          members: {
            create: memberIds.map((id) => ({ userId: id })),
          },
        },
        include: { _count: { select: { members: true } } },
      });
      return formatGroup(group);
    },

    sendFriendRequest: async (_, { input }, { userID }) => {
      if (!userID) {
        throw new Error('Please login to send a friend request');
      }
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
