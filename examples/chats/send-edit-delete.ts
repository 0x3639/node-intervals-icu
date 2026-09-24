/**
 * Send a message to the authenticated athlete, edit its content, then delete
 * it. This writes to the account: it creates and removes a real chat
 * message. The message is deleted in a finally block so a failed step does
 * not leave it behind.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account (briefly).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/chats/send-edit-delete.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const me = await client.athletes.getAthlete();
if (!me.id) {
  console.error('Could not resolve the authenticated athlete id.');
  process.exit(1);
}
const content = `Created by the SDK example ${Date.now()}`;
const edited = `${content} (edited)`;

const sent = await client.chats.sendMessage({ to_athlete_id: me.id, content, type: 'TEXT' });

// The API's response shape for chat id varies: `chat_id` is not in the vendored Message
// schema, so read it defensively from the raw response, then fall back to the new chat's
// id, then search for the message by its (unique) content if neither is present.
let chatId = (sent.message as { chat_id?: number } | undefined)?.chat_id ?? sent.new_chat?.id;
let msgId = sent.message?.id ?? sent.id;

if (typeof chatId !== 'number' || typeof msgId !== 'number') {
  for (const chat of await client.chats.listChats()) {
    if (typeof chat.id !== 'number') continue;
    const hit = (await client.chats.listMessages(chat.id, { limit: 20 })).find((m) => m.content === content);
    if (typeof hit?.id === 'number') {
      chatId = chat.id;
      msgId = hit.id;
      break;
    }
  }
}

if (typeof chatId !== 'number' || typeof msgId !== 'number') {
  console.log('Could not determine the chat id or message id of the sent message');
} else {
  console.log(`Sent message id=${msgId} in chat=${chatId}`);

  try {
    await client.chats.updateMessage(chatId, msgId, { content: edited });
    const messages = await client.chats.listMessages(chatId, { limit: 20 });
    console.log(`Edited content: ${messages.find((m) => m.id === msgId)?.content}`);
  } finally {
    await client.chats.deleteMessage(chatId, msgId);
    console.log(`Deleted message ${msgId}`);
  }
}
// #endregion main
