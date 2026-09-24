import { describe, it, expect } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ErrorHandler, IntervalsAPIError } from '../src/core/error-handler.js';
import { RateLimitTracker } from '../src/core/rate-limit-tracker.js';

const axiosError = (status: number, data: unknown, headers: Record<string, string> = {}) => {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, data, headers, statusText: '', config } as AxiosResponse;
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, undefined, response);
};

describe('IntervalsAPIError.details', () => {
  const handler = new ErrorHandler();
  const tracker = new RateLimitTracker();

  it('surfaces a 422 body: `error` text in the message and the whole body in details', () => {
    const err = handler.handleError(axiosError(422, { status: 422, error: 'Cannot send message to self' }), tracker);
    expect(err).toBeInstanceOf(IntervalsAPIError);
    expect(err.status).toBe(422);
    expect(err.message).toBe('Request failed with status code 422: Cannot send message to self');
    expect(err.details).toEqual({ status: 422, error: 'Cannot send message to self' });
  });

  it('falls back to a `message` field, then to the axios message', () => {
    expect(handler.handleError(axiosError(400, { message: 'bad window' }), tracker).message).toBe('Request failed with status code 400: bad window');
    expect(handler.handleError(axiosError(500, undefined), tracker).message).toBe('Request failed with status code 500');
    expect(handler.handleError(axiosError(500, {}), tracker).message).toBe('Request failed with status code 500');
  });

  it('keeps a plain-text body and attaches it as details', () => {
    const err = handler.handleError(axiosError(502, 'Bad Gateway'), tracker);
    expect(err.message).toBe('Request failed with status code 502: Bad Gateway');
    expect(err.details).toBe('Bad Gateway');
  });

  it('keeps the fixed 401/404 messages but still attaches details', () => {
    const e401 = handler.handleError(axiosError(401, { error: 'nope' }), tracker);
    expect(e401.message).toBe('Invalid API key or authentication failed');
    expect(e401.code).toBe('AUTH_FAILED');
    expect(e401.details).toEqual({ error: 'nope' });
    const e404 = handler.handleError(axiosError(404, { error: 'gone' }), tracker);
    expect(e404.code).toBe('NOT_FOUND');
    expect(e404.details).toEqual({ error: 'gone' });
  });

  it('attaches details to rate-limit errors too', () => {
    const err = handler.handleError(axiosError(429, { error: 'slow down' }, { 'retry-after': '7' }), tracker);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryAfter).toBe(7);
    expect(err.details).toEqual({ error: 'slow down' });
  });
});
