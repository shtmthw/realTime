import { gql } from "apollo-server";

export const typeDefs = gql`
    type Query {
        users: [userSchema]
        user(ID: ID!): userSchema
        getPersonalMessages(receiverID: String!): [sentMessage]
        getGroups: [groupSchema]
        getGroupMessages(groupID: ID!): [sentMessage]
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

    input createNewUser {
        name: String!
        email: String!
        password: String!
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

    type genaratedToken {
        name: String!
        token: String!
    }

    type Mutation {
        createMessage(newMsg: msgSchema!): sentMessage
        createGroupMessage(newMsg: groupMessageSchema!): sentMessage
        createNewUser(newUser: createNewUser!): userSchema
        loginUser(userInfo: userInfoSchema!): genaratedToken
        createGroup(newGroup: createGroupInput!): groupSchema
    }
`;
