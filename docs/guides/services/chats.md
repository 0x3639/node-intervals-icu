---
title: Chats
---
# Chats

`client.chats` manages direct and group chat conversations for the athlete: listing chats, sending and editing messages, and marking messages as seen. Blocking a chat mutes the other athlete in a private conversation.

## Methods

| Method | What it does |
|---|---|
| {@link ChatService.listChats} | List chats (including groups) for the athlete, most recently active first |
| {@link ChatService.listMessages} | List messages in a chat |
| {@link ChatService.sendMessage} | Send a message |
| {@link ChatService.markSeen} | Mark a message as seen (update last seen message ID) |
| {@link ChatService.getChat} | One chat by id |
| {@link ChatService.listGroups} | Group chats for the athlete, in name order |
| {@link ChatService.blockChat} | Block (on = true) or unblock the other athlete in a private chat |
| {@link ChatService.updateMessage} | Edit a message's content or answer (the only fields the API updates) |
| {@link ChatService.deleteMessage} | Delete a message |

## Examples

_Added in a later task._

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
