import { AxiosError } from 'axios';
import type { APIError } from '../types/index.js';
import type { RateLimitTracker } from './rate-limit-tracker.js';

/**
 * Custom error class for Intervals.icu API errors
 */
export class IntervalsAPIError extends Error implements APIError {
  status?: number;
  code?: string;
  /** Seconds to wait before retrying, from the Retry-After header */
  retryAfter?: number;
  /** The response body the API sent with the error, when there was one */
  details?: unknown;

  constructor(message: string, status?: number, code?: string, retryAfter?: number, details?: unknown) {
    super(message);
    this.name = 'IntervalsAPIError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.details = details;
    Object.setPrototypeOf(this, IntervalsAPIError.prototype);
  }
}

/** Longest server explanation appended to an error message; `details` keeps the whole body. */
const MAX_SERVER_TEXT = 200;

/**
 * Binary downloads (`responseType: 'arraybuffer'`) deliver error bodies as bytes. Decode
 * them so a JSON or text explanation is usable like any other; leave other bodies as is.
 */
function decodeBody(data: unknown): unknown {
  const isBinary = data instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data));
  if (!isBinary) return data;
  const text = Buffer.from(data as ArrayBuffer).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** The human-readable part of an error body: `error` or `message` of an object, or a short non-HTML text body. */
function extractServerText(body: unknown): string | undefined {
  let text: string | undefined;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    // An HTML error page (gateway 502/504s) is noise in a message; it stays in `details`.
    if (trimmed && !trimmed.startsWith('<')) text = trimmed;
  } else if (body && typeof body === 'object') {
    const { error, message } = body as { error?: unknown; message?: unknown };
    text = [error, message].find((v): v is string => typeof v === 'string' && v.length > 0);
  }
  if (!text) return undefined;
  return text.length > MAX_SERVER_TEXT ? `${text.slice(0, MAX_SERVER_TEXT)}…` : text;
}

/**
 * Error handler service
 * Follows Single Responsibility Principle - only handles error transformation
 */
export class ErrorHandler {
  handleError(error: AxiosError, rateLimitTracker: RateLimitTracker): IntervalsAPIError {
    if (error.response) {
      const status = error.response.status;
      const details = decodeBody(error.response.data);
      // The API explains validation failures in the body, as `error` (e.g. 422
      // `{ status: 422, error: 'Cannot send message to self' }`); some responses use
      // `message`. Surface whichever is present so a 422 is never a bare status code.
      const serverText = extractServerText(details);
      const message = serverText ? `${error.message}: ${serverText}` : error.message;
      
      if (status === 429) {
        const resetTime = rateLimitTracker.getReset();
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        let retryAfter: number | undefined;
        if (typeof retryAfterHeader === 'string') {
          const seconds = parseInt(retryAfterHeader, 10);
          if (Number.isFinite(seconds)) {
            retryAfter = seconds;
          } else {
            // HTTP-date format (e.g. 'Wed, 21 Oct 2015 07:28:00 GMT')
            const date = Date.parse(retryAfterHeader);
            if (!isNaN(date)) {
              retryAfter = Math.max(0, Math.round((date - Date.now()) / 1000));
            }
          }
        }
        return new IntervalsAPIError(
          `Rate limit exceeded. ${resetTime ? `Resets at ${resetTime.toISOString()}` : ''}`,
          status,
          'RATE_LIMIT_EXCEEDED',
          retryAfter,
          details
        );
      }
      
      if (status === 401) {
        return new IntervalsAPIError('Invalid API key or authentication failed', status, 'AUTH_FAILED', undefined, details);
      }
      
      if (status === 404) {
        return new IntervalsAPIError('Resource not found', status, 'NOT_FOUND', undefined, details);
      }
      
      return new IntervalsAPIError(message, status, undefined, undefined, details);
    }
    
    if (error.code === 'ECONNABORTED') {
      return new IntervalsAPIError('Request timeout', undefined, 'TIMEOUT');
    }
    
    return new IntervalsAPIError(error.message || 'Unknown error occurred');
  }
}
