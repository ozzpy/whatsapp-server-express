import { Chat, db, getRandomId, Message, MessageType, random, Recipient, User } from "../db";
import { IResolvers } from "graphql-tools/dist/Interfaces";
import {
  AddChatMutationArgs, AddGroupMutationArgs, AddMessageMutationArgs, ChatQueryArgs,
  RemoveChatMutationArgs, RemoveMessagesMutationArgs
} from "../types";
import * as moment from "moment";
import { PubSub, withFilter } from 'graphql-subscriptions';

let users = db.users;
let chats = db.chats;
export const pubsub = new PubSub();

export const resolvers: IResolvers = {
  Query: {
    // Show all users for the moment.
    users: (obj: any, args: any, {user: {id: currentUserId}}: {user: User}) => users.filter(user => user.id !== currentUserId),
    chats: (obj: any, args: any, {user: {id: currentUserId}}: {user: User}) => chats.filter(chat => chat.listingIds.includes(currentUserId)),
    chat: (obj: any, {chatId}: ChatQueryArgs) => chats.find(chat => chat.id === chatId),
  },
  Mutation: {
    addChat: (obj: any, {recipientId}: AddChatMutationArgs, {user: {id: currentUserId}}: {user: User}) => {
      if (!users.find(user => user.id === recipientId)) {
        throw new Error(`Recipient ${recipientId} doesn't exist.`);
      }

      let chat = chats.find(chat => !chat.name && chat.userIds.includes(currentUserId) && chat.userIds.includes(recipientId));
      if (chat) {
        // Chat already exists. Both users are already in the userIds array
        const chatId = chat.id;
        if (!chat.listingIds.includes(currentUserId)) {
          // The chat isn't listed for the current user. Add him to the memberIds
          chat.listingIds.push(currentUserId);
          chats.find(chat => chat.id === chatId)!.listingIds.push(currentUserId);
        } else {
          throw new Error(`Chat already exists.`);
        }
      } else {
        // Create the chat
        const id = (chats.length && String(Number(chats[chats.length - 1].id) + 1)) || '1';
        chat = {
          id,
          name: null,
          picture: null,
          adminIds: null,
          ownerId: null,
          userIds: [currentUserId, recipientId],
          // Chat will not be listed to the other user until the first message gets written
          listingIds: [currentUserId],
          memberIds: null,
          messages: [],
        };
        chats.push(chat);
      }

      return chat;
    },
    addGroup: (obj: any, {recipientIds, groupName}: AddGroupMutationArgs, {user: {id: currentUserId}}: {user: User}) => {
      recipientIds.forEach(recipientId => {
        if (!users.find(user => user.id === recipientId)) {
          throw new Error(`Recipient ${recipientId} doesn't exist.`);
        }
      });

      const id = (chats.length && String(Number(chats[chats.length - 1].id) + 1)) || '1';
      const chat: Chat = {
        id,
        name: groupName,
        picture: null,
        adminIds: [currentUserId],
        ownerId: currentUserId,
        userIds: [currentUserId, ...recipientIds],
        listingIds: [currentUserId, ...recipientIds],
        memberIds: [currentUserId, ...recipientIds],
        messages: [],
      };
      chats.push(chat);
      return chat;
    },
    removeChat: (obj: any, {chatId}: RemoveChatMutationArgs, {user: {id: currentUserId}}: {user: User}) => {
      const chat = chats.find(chat => chat.id === chatId);

      if (!chat) {
        throw new Error(`The chat ${chatId} doesn't exist.`);
      }

      if (!chat.name) {
        // Chat
        if (!chat.listingIds.includes(currentUserId)) {
          throw new Error(`The user is not a member of the chat ${chatId}.`);
        }

        // Instead of chaining map and filter we can loop once using reduce
        const messages = chat.messages.reduce<Message[]>((filtered, message) => {
          // Remove the current user from the message holders
          message.holderIds = message.holderIds.filter(holderId => holderId !== currentUserId);

          if (message.holderIds.length !== 0) {
            filtered.push(message);
          } // else discard the message

          return filtered;
        }, []);

        // Remove the current user from who gets the chat listed. The chat will no longer appear in his list
        const listingIds = chat.listingIds.filter(listingId => listingId !== currentUserId);

        // Check how many members are left
        if (listingIds.length === 0) {
          // Delete the chat
          chats = chats.filter(chat => chat.id !== chatId);
        } else {
          // Update the chat
          chats = chats.map(chat => {
            if (chat.id === chatId) {
              chat = {...chat, listingIds, messages};
            }
            return chat;
          });
        }
        return chatId;
      } else {
        // Group
        if (chat.ownerId !== currentUserId) {
          throw new Error(`Group ${chatId} is not owned by the user.`);
        }

        // Instead of chaining map and filter we can loop once using reduce
        const messages = chat.messages.reduce<Message[]>((filtered, message) => {
          // Remove the current user from the message holders
          message.holderIds = message.holderIds.filter(holderId => holderId !== currentUserId);

          if (message.holderIds.length !== 0) {
            filtered.push(message);
          } // else discard the message

          return filtered;
        }, []);

        // Remove the current user from who gets the group listed. The group will no longer appear in his list
        const listingIds = chat.listingIds.filter(listingId => listingId !== currentUserId);

        // Check how many members (including previous ones who can still access old messages) are left
        if (listingIds.length === 0) {
          // Remove the group
          chats = chats.filter(chat => chat.id !== chatId);
        } else {
          // Update the group

          // Remove the current user from the chat members. He is no longer a member of the group
          const memberIds = chat.memberIds!.filter(memberId => memberId !== currentUserId);
          // Remove the current user from the chat admins
          const adminIds = chat.adminIds!.filter(memberId => memberId !== currentUserId);
          // Set the owner id to be null. A null owner means the group is read-only
          let ownerId: string | null = null;

          // Check if there is any admin left
          if (adminIds!.length) {
            // Pick an admin as the new owner. The group is no longer read-only
            ownerId = chat.adminIds![0];
          }

          chats = chats.map(chat => {
            if (chat.id === chatId) {
              chat = {...chat, messages, listingIds, memberIds, adminIds, ownerId};
            }
            return chat;
          });
        }
        return chatId;
      }
    },
    addMessage: (obj: any, {chatId, content}: AddMessageMutationArgs, {user: {id: currentUserId}}: {user: User}) => {
      if (content === null || content === '') {
        throw new Error(`Cannot add empty or null messages.`);
      }

      let chat = chats.find(chat => chat.id === chatId);

      if (!chat) {
        throw new Error(`Cannot find chat ${chatId}.`);
      }

      let holderIds = chat.listingIds;

      if (!chat.name) {
        // Chat
        if (!chat.listingIds.find(listingId => listingId === currentUserId)) {
          throw new Error(`The chat ${chatId} must be listed for the current user before adding a message.`);
        }

        const recipientId = chat.userIds.filter(userId => userId !== currentUserId)[0];

        if (!chat.listingIds.find(listingId => listingId === recipientId)) {
          // Chat is not listed for the recipient. Add him to the listingIds
          const listingIds = chat.listingIds.concat(recipientId);
          chat = {...chat, listingIds};

          chats = chats.map(_chat => _chat.id === chatId ? chat! : _chat);

          pubsub.publish('chatAdded', {
            chatAdded: {...chat, creatorId: currentUserId}
          });

          holderIds = listingIds;
        }
      } else {
        // Group
        if (!chat.memberIds!.find(memberId => memberId === currentUserId)) {
          throw new Error(`The user is not a member of the group ${chatId}. Cannot add message.`);
        }

        holderIds = chat.memberIds!;
      }

      const id = random ? getRandomId() : (chat.messages.length && String(Number(chat.messages[chat.messages.length - 1].id) + 1)) || '1';

      let recipients: Recipient[] = [];

      holderIds.forEach(holderId => {
        if (holderId !== currentUserId) {
          recipients.push({
            id: holderId,
            receivedAt: null,
            readAt: null,
          });
        }
      });

      const message: Message = {
        id,
        senderId: currentUserId,
        content,
        createdAt: moment().unix(),
        type: MessageType.TEXT,
        recipients,
        holderIds,
      };

      chats = chats.map(chat => {
        if (chat.id === chatId) {
          chat = {...chat, messages: chat.messages.concat(message)}
        }
        return chat;
      });

      pubsub.publish('messageAdded', {
        messageAdded: {...message, chatId}
      });

      return message;
    },
    removeMessages: (obj: any, {chatId, messageIds, all}: RemoveMessagesMutationArgs, {user: {id: currentUserId}}: {user: User}) => {
      const chat = chats.find(chat => chat.id === chatId);

      if (!chat) {
        throw new Error(`Cannot find chat ${chatId}.`);
      }

      if (!chat.listingIds.find(listingId => listingId === currentUserId)) {
        throw new Error(`The chat/group ${chatId} is not listed for the current user, so there is nothing to delete.`);
      }

      if (all && messageIds) {
        throw new Error(`Cannot specify both 'all' and 'messageIds'.`);
      }

      let deletedIds: string[] = [];
      chats = chats.map(chat => {
        if (chat.id === chatId) {
          // Instead of chaining map and filter we can loop once using reduce
          const messages = chat.messages.reduce<Message[]>((filtered, message) => {
            if (all || messageIds!.includes(message.id)) {
              deletedIds.push(message.id);
              // Remove the current user from the message holders
              message.holderIds = message.holderIds.filter(holderId => holderId !== currentUserId);
            }

            if (message.holderIds.length !== 0) {
              filtered.push(message);
            } // else discard the message

            return filtered;
          }, []);
          chat = {...chat, messages};
        }
        return chat;
      });
      return deletedIds;
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator('messageAdded'),
        (payload, variables, {user: {id: currentUserId}}: { user: User }) => {
          return (!variables.chatId || payload.messageAdded.chatId === variables.chatId) &&
            !!payload.messageAdded.recipients.filter((recipient: Recipient) => recipient.id === currentUserId)[0];
        }),
    },
    chatAdded: {
      subscribe: withFilter(() => pubsub.asyncIterator('chatAdded'),
        (payload, variables, {user: {id: currentUserId}}: { user: User }) => {
          return payload.chatAdded.creatorId !== currentUserId && payload.chatAdded.listingIds.includes(currentUserId);
        }),
    }
  },
  Chat: {
    name: (chat: Chat, args: any, {user: {id: currentUserId}}: {user: User}) => chat.name ? chat.name : users
      .find(user => user.id === chat.userIds.find(userId => userId !== currentUserId))!.name,
    picture: (chat: Chat, args: any, {user: {id: currentUserId}}: {user: User}) => chat.name ? chat.picture : users
      .find(user => user.id === chat.userIds.find(userId => userId !== currentUserId))!.picture,
    messages: (chat: Chat, args: any, {user: {id: currentUserId}}: {user: User}) => chat.messages
      .filter(message => message.holderIds.includes(currentUserId))
      .sort((a, b) => a.createdAt - b.createdAt) || [],
    lastMessage: (chat: Chat, args: any, {user: {id: currentUserId}}: {user: User}) => chat.messages
      .filter(message => message.holderIds.includes(currentUserId))
      .sort((a, b) => b.createdAt - a.createdAt)[0] || null,
    unreadMessages: (chat: Chat, args: any, {user: {id: currentUserId}}: {user: User}) => chat.messages
      .filter(message => message.holderIds.includes(currentUserId) &&
        message.recipients.find(recipient => recipient.id === currentUserId && !recipient.readAt))
      .length,
    isGroup: (chat: Chat) => !!chat.name,
  },
  Message: {
    sender: (message: Message) => users.find(user => user.id === message.senderId),
    ownership: (message: Message, args: any, {user: {id: currentUserId}}: {user: User}) => message.senderId === currentUserId,
    chatId: (message: Message) => (<any>message).chatId ||
      chats.filter(chat => !!chat.messages.filter(_message => _message.id === message.id)[0])[0].id,
  },
};
