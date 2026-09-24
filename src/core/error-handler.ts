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

/**
 * Error handler service
 * Follows Single Responsibility Principle - only handles error transformation
 */
export class ErrorHandler {
  handleError(error: AxiosError, rateLimitTracker: RateLimitTracker): IntervalsAPIError {
    if (error.response) {
      const status = error.response.status;
      const details = error.response.data;
      // The API explains validation failures in the body, as `error` (e.g. 422
      // `{ status: 422, error: 'Cannot send message to self' }`); some responses use
      // `message`. Surface whichever is present so a 422 is never a bare status code.
      const body = details as { error?: unknown; message?: unknown } | string | undefined;
      const serverText =
        typeof body === 'string' && body.trim() ? body.trim()
        : body && typeof body === 'object'
          ? [body.error, body.message].find((v): v is string => typeof v === 'string' && v.length > 0)
          : undefined;
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
