import type { IHttpClient } from '../core/http-client.interface.js';
import type { Chat, Message, NewMessage, SendResponse, UpdateMessageDTO } from '../types/index.js';

/**
 * Service for chats and messages
 */
export class ChatService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string,
  ) {}

  /** List chats (including groups) for the athlete, most recently active first */
  async listChats(athleteId?: string): Promise<Chat[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Chat[]>({ method: 'GET', url: `/athlete/${id}/chats` });
  }

  /** List messages in a chat */
  async listMessages(chatId: number, options?: { sinceId?: number; limit?: number }): Promise<Message[]> {
    return this.httpClient.request<Message[]>({ method: 'GET', url: `/chats/${chatId}/messages`, params: options as Record<string, unknown> });
  }

  /** Send a message */
  async sendMessage(data: NewMessage): Promise<SendResponse> {
    return this.httpClient.request<SendResponse>({ method: 'POST', url: `/chats/send-message`, data });
  }

  /** Mark a message as seen (update last seen message ID) */
  async markSeen(chatId: number, messageId: number): Promise<void> {
    await this.httpClient.request<void>({ method: 'PUT', url: `/chats/${chatId}/messages/${messageId}/seen` });
  }

  // ── Phase 3 ──

  /** One chat by id */
  async getChat(chatId: number): Promise<Chat> {
    return this.httpClient.request<Chat>({ method: 'GET', url: `/chats/${chatId}` });
  }

  /** Group chats for the athlete, in name order */
  async listGroups(athleteId?: string): Promise<Chat[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Chat[]>({ method: 'GET', url: `/athlete/${id}/groups` });
  }

  /** Block (on = true) or unblock the other athlete in a private chat */
  async blockChat(chatId: number, on: boolean): Promise<Chat> {
    return this.httpClient.request<Chat>({ method: 'PUT', url: `/chats/${chatId}/block`, params: { on } });
  }

  /** Edit a message's content or answer (the only fields the API updates). Returns an untyped object. */
  async updateMessage(chatId: number, messageId: number, message: UpdateMessageDTO): Promise<Record<string, unknown>> {
    return this.httpClient.request<Record<string, unknown>>({ method: 'PUT', url: `/chats/${chatId}/messages/${messageId}`, data: message });
  }

  /** Delete a message. The API returns an untyped object. */
  async deleteMessage(chatId: number, messageId: number): Promise<Record<string, unknown>> {
    return this.httpClient.request<Record<string, unknown>>({ method: 'DELETE', url: `/chats/${chatId}/messages/${messageId}` });
  }
}
