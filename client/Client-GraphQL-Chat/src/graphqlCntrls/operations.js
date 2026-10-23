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

export const GET_USERS = gql`
  query GetUsers {
    users {
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

export const CREATE_SIMPLE_USER = gql`
  mutation CreateSimpleUser($newUser: createSimpleUser!) {
    createSimpleUser(newUser: $newUser) {
      id
      name
      email
      createdAt
    }
  }
`;

export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($input: sendFriendRequestInput!) {
    sendFriendRequest(input: $input) {
      id
      senderId
      receiverId
      senderName
      receiverName
      status
      createdAt
    }
  }
`;

export const GET_FRIEND_REQUESTS = gql`
  query GetFriendRequests {
    getFriendRequests {
      id
      senderId
      receiverId
      senderName
      receiverName
      status
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
