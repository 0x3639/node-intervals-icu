import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

const mockChat = {
  id: 100,
  name: 'Coach Chat',
  type: 'DIRECT',
  members: [{ athlete_id: 'i123', role: 'OWNER' }],
};

const mockMessage = {
  id: 500,
  chat_id: 100,
  from_athlete_id: 'i123',
  content: 'Great workout!',
  type: 'TEXT',
  created: '2024-01-15T10:00:00Z',
};

describe('IntervalsClient - Chats', () => {
  let client: IntervalsClient;

  beforeEach(() => {
    setupAxiosMock(mockedAxios, async (config: any) => {
      if (config.url === '/athlete/test-athlete-id/chats' && config.method === 'GET') {
        return [mockChat];
      }
      if (config.url.match(/\/chats\/\d+\/messages$/) && config.method === 'GET') {
        return [mockMessage];
      }
      if (config.url === '/chats/send-message' && config.method === 'POST') {
        return { id: 501, chat_id: 100, ...config.data, created: '2024-01-15T11:00:00Z' };
      }
      if (config.url.match(/\/messages\/\d+\/seen$/) && config.method === 'PUT') {
        return;
      }
      return null;
    });

    client = new IntervalsClient({
      apiKey: 'test-api-key',
      athleteId: 'test-athlete-id',
    });
  });

  it('should list chats', async () => {
    const chats = await client.chats.listChats();
    expect(chats).toBeDefined();
    expect(chats.length).toBe(1);
    expect(chats[0].id).toBe(100);
    expect(chats[0].name).toBe('Coach Chat');
  });

  it('should list messages in a chat', async () => {
    const messages = await client.chats.listMessages(100);
    expect(messages).toBeDefined();
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Great workout!');
  });

  it('should send a message', async () => {
    const response = await client.chats.sendMessage({
      to_athlete_id: 'i456',
      content: 'Hello!',
      type: 'TEXT',
    });
    expect(response).toBeDefined();
    expect(response.id).toBeDefined();
  });

  it('should mark a message as seen', async () => {
    await expect(client.chats.markSeen(100, 500)).resolves.toBeUndefined();
  });
});

describe('ChatService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return {}; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getChat hits /chats/{id}', async () => {
    await client.chats.getChat(42);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/chats/42');
  });

  it('listGroups hits /athlete/{id}/groups', async () => {
    await client.chats.listGroups();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/groups');
  });

  it('blockChat PUTs /chats/{id}/block with on as a query param', async () => {
    await client.chats.blockChat(42, true);
    expect(seen[0].method).toBe('PUT');
    expect(seen[0].url).toBe('/chats/42/block');
    expect(seen[0].params).toEqual({ on: true });
  });

  it('updateMessage PUTs the message body to /chats/{id}/messages/{msgId}', async () => {
    await client.chats.updateMessage(42, 7, { content: 'edited' });
    expect(seen[0].method).toBe('PUT');
    expect(seen[0].url).toBe('/chats/42/messages/7');
    expect(seen[0].data).toEqual({ content: 'edited' });
  });

  it('deleteMessage sends DELETE /chats/{id}/messages/{msgId}', async () => {
    await client.chats.deleteMessage(42, 7);
    expect(seen[0].method).toBe('DELETE');
    expect(seen[0].url).toBe('/chats/42/messages/7');
  });
});
