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

### List and read

List the athlete's chats and groups, then read one chat's details and its most recent messages.

{@includeCode ../../../examples/chats/list-and-read.ts#main}

### Send, edit and delete

Send a message to another athlete, edit its content, then delete it. The API rejects a message to yourself with `422 Cannot send message to self`, so the example reads the recipient from `INTERVALS_CHAT_TO_ATHLETE_ID`; that athlete receives one real message, which is edited and then deleted.

CI never runs this example; running it by hand changes the authenticated account. If the create call itself fails after the server committed it, nothing is cleaned up: search the account for `Created by the SDK example` (or `Uploaded by the SDK example`) and delete it by hand.

{@includeCode ../../../examples/chats/send-edit-delete.ts#main}

## Behaviour notes

- {@link ChatService.blockChat}, {@link ChatService.updateMessage} and {@link ChatService.deleteMessage} mutate the account. {@link ChatService.updateMessage} accepts only `content` and `answer` ({@link UpdateMessageDTO}); the SDK's live tests restore state.
- {@link ChatService.sendMessage} with your own id as `to_athlete_id` fails with `422` and `error: "Cannot send message to self"` (on {@link IntervalsAPIError} as `details`); pick a real recipient.
- See [API behaviour](../api-behaviour.md) for the cross-service list.
