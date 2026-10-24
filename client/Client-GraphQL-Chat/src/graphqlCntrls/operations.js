import { gql } from '@apollo/client';

export const SIGNUP = gql`
  mutation CreateNewUser($newUser: createNewUser!) {
    createNewUser(newUser: $newUser) {
      id
      name
      email
      createdAt
    }
  }
`;

export const LOGIN = gql`
  mutation LoginUser($userInfo: userInfoSchema!) {
    loginUser(userInfo: $userInfo) {
      name
      token
    }
  }
`;

export const GET_ME = gql`
  query Me {
    me {
      id
      name
      email
      createdAt
    }
  }
`;

export const GET_CONVERSATIONS = gql`
  query GetConversations {
    getConversations {
      id
      name
      email
      createdAt
    }
  }
`;

export const ADD_CONVERSATION = gql`
  mutation AddConversation($username: String!) {
    addConversation(username: $username) {
      id
      name
      email
      createdAt
    }
  }
`;

export const FIND_USER_BY_USERNAME = gql`
  query FindUserByUsername($username: String!) {
    findUserByUsername(username: $username) {
      id
      name
      email
      createdAt
    }
  }
`;

export const GET_PERSONAL_MESSAGES = gql`
  query GetPersonalMessages($receiverID: String!) {
    getPersonalMessages(receiverID: $receiverID) {
      id
      text
      senderID
      senderName
      receiverID
      createdAt
    }
  }
`;

export const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
      id
      name
      creatorId
      memberCount
      createdAt
    }
  }
`;

export const GET_GROUP = gql`
  query GetGroup($groupID: ID!) {
    getGroup(ID: $groupID) {
      id
      name
      creatorId
      memberCount
      createdAt
    }
  }
`;

export const GET_GROUP_MESSAGES = gql`
  query GetGroupMessages($groupID: ID!) {
    getGroupMessages(groupID: $groupID) {
      id
      text
      senderID
      senderName
      groupID
      createdAt
    }
  }
`;

export const CREATE_MESSAGE = gql`
  mutation CreateMessage($newMsg: msgSchema!) {
    createMessage(newMsg: $newMsg) {
      id
      text
      senderID
      senderName
      receiverID
      createdAt
    }
  }
`;

export const CREATE_GROUP_MESSAGE = gql`
  mutation CreateGroupMessage($newMsg: groupMessageSchema!) {
    createGroupMessage(newMsg: $newMsg) {
      id
      text
      senderID
      senderName
      groupID
      createdAt
    }
  }
`;

export const CREATE_GROUP = gql`
  mutation CreateGroup($newGroup: createGroupInput!) {
    createGroup(newGroup: $newGroup) {
      id
      name
      creatorId
      memberCount
      createdAt
    }
  }
`;

export const ADD_GROUP_MEMBERS = gql`
  mutation AddGroupMembers($groupID: ID!, $memberIds: [ID!]!) {
    addGroupMembers(groupID: $groupID, memberIds: $memberIds) {
      id
      name
      creatorId
      memberCount
      createdAt
    }
  }
`;
