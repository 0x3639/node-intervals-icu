/**
 * List the athlete's chats and groups, then read one chat's details and its
 * most recent messages. Does not change the account: every call is a read.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/chats/list-and-read.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const chats = await client.chats.listChats();
console.log(`${chats.length} chats`);
for (const chat of chats) {
  console.log(`- ${chat.id}  ${chat.type ?? 'unknown type'}  ${chat.name ?? ''}`);
}

const groups = await client.chats.listGroups();
console.log(`${groups.length} group chats`);

const first = chats[0];
if (!first || first.id === undefined) {
  console.log('No chats found');
} else {
  const chat = await client.chats.getChat(first.id);
  console.log(`Chat ${chat.id}: ${chat.name ?? chat.type ?? ''}`);

  const messages = await client.chats.listMessages(first.id, { limit: 5 });
  console.log(`${messages.length} most recent messages`);
  for (const message of messages) {
    console.log(`- ${message.created ?? ''}  ${message.content ?? ''}`);
  }
}
// #endregion main
