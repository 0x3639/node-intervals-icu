/**
 * Send a message to another athlete, edit its content, then delete it. The
 * API rejects a message to yourself (422 "Cannot send message to self"), so the
 * recipient comes from INTERVALS_CHAT_TO_ATHLETE_ID and must be someone who
 * agreed to receive one test message. This writes to the account: it creates
 * and removes a real chat message. The message is deleted in a finally block so a failed step does
 * not leave it behind.
 *
 * If the create call itself fails after the server committed it, nothing is cleaned
 * up: search the account for `Created by the SDK example` (or `Uploaded by the SDK
 * example`) and delete it by hand.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account (briefly).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   export INTERVALS_CHAT_TO_ATHLETE_ID="i12345"   # the consenting recipient
 *   npx tsx examples/chats/send-edit-delete.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}
const recipient = process.env.INTERVALS_CHAT_TO_ATHLETE_ID;
if (!recipient) {
  console.error('Set INTERVALS_CHAT_TO_ATHLETE_ID to an athlete who agreed to receive a test message; the API rejects messages to yourself.');
  process.exit(1);
}

// #region main
// maxRetries: 0 — a create that committed before a 5xx would be repeated by a retry, and only the last response's id would be cleaned up.
const client = new IntervalsClient({ apiKey, maxRetries: 0 });

const content = `Created by the SDK example ${Date.now()}`;
const edited = `${content} (edited)`;

const sent = await client.chats.sendMessage({ to_athlete_id: recipient, content, type: 'TEXT' });

// The API's response shape for chat id varies: `chat_id` is not in the vendored Message
// schema, so read it defensively from the raw response, then fall back to the new chat's
// id, then search for the message by its (unique) content if neither is present.
let chatId = (sent.message as { chat_id?: number } | undefined)?.chat_id ?? sent.new_chat?.id;
let msgId = sent.message?.id ?? sent.id;

if (typeof chatId !== 'number' || typeof msgId !== 'number') {
  for (const chat of await client.chats.listChats()) {
    if (typeof chat.id !== 'number') continue;
    // One unreadable chat must not abandon the search: the message still needs deleting.
    try {
      const hit = (await client.chats.listMessages(chat.id, { limit: 20 })).find((m) => m.content === content);
      if (typeof hit?.id === 'number') {
        chatId = chat.id;
        msgId = hit.id;
        break;
      }
    } catch {
      continue;
    }
  }
}

if (typeof chatId !== 'number' || typeof msgId !== 'number') {
  console.log('Could not determine the chat id or message id of the sent message');
  console.log(`The message is still there, with content "${content}" — delete it by hand from the Intervals.icu chat`);
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
