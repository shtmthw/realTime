import { gql } from "apollo-server";

export const typeDefs = gql`
    type Query {
        me: userSchema
        users: [userSchema]
        user(ID: ID!): userSchema
        getConversations: [userSchema]
        findUserByUsername(username: String!): userSchema
        getPersonalMessages(receiverID: String!): [sentMessage]
        getGroups: [groupSchema]
        getGroup(ID: ID!): groupSchema
        getGroupMessages(groupID: ID!): [sentMessage]
        getFriendRequests: [friendRequestSchema]
    }

    type userSchema {
        id: ID!
        name: String!
        email: String!
        createdAt: String!
    }

    type sentMessage {
        id: ID!
        text: String!
        senderID: String!
        senderName: String
        receiverID: String
        groupID: String
        createdAt: String!
    }

    type groupSchema {
        id: ID!
        name: String!
        creatorId: ID!
        memberCount: Int!
        createdAt: String!
    }

    type friendRequestSchema {
        id: ID!
        senderId: ID!
        receiverId: ID!
        senderName: String
        receiverName: String
        status: String!
        createdAt: String!
    }

input createNewUser {
    name: String!
    email: String!
    password: String!
}

input createSimpleUser {
    name: String!
}

    input userInfoSchema {
        email: String!
        password: String!
    }

    input msgSchema {
        text: String!
        receiverID: String
    }

    input groupMessageSchema {
        text: String!
        groupID: ID!
    }

    input createGroupInput {
        name: String!
        memberIds: [ID!]!
    }

    input sendFriendRequestInput {
        receiverId: ID!
    }

    type genaratedToken {
        name: String!
        token: String!
    }

    type Mutation {
        createMessage(newMsg: msgSchema!): sentMessage
        createGroupMessage(newMsg: groupMessageSchema!): sentMessage
        createNewUser(newUser: createNewUser!): userSchema
        createSimpleUser(newUser: createSimpleUser!): userSchema
        loginUser(userInfo: userInfoSchema!): genaratedToken
        createGroup(newGroup: createGroupInput!): groupSchema
        addGroupMembers(groupID: ID!, memberIds: [ID!]!): groupSchema
        addConversation(username: String!): userSchema
        sendFriendRequest(input: sendFriendRequestInput!): friendRequestSchema
    }
`;
