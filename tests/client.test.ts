import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient, IntervalsAPIError } from '../src/client.js';
import axios, { AxiosError } from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('IntervalsClient - Core Functionality', () => {
  describe('Client Initialization', () => {
    beforeEach(() => {
      const mockInstance = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
      };
      
      mockedAxios.create = vi.fn(() => mockInstance);
    });

    it('should create a client with API key', () => {
      const client = new IntervalsClient({
        apiKey: 'test-api-key',
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(IntervalsClient);
    });

    it('should create a client with custom athleteId', () => {
      const client = new IntervalsClient({
        apiKey: 'test-api-key',
        athleteId: 'custom-athlete-id',
      });

      expect(client).toBeDefined();
    });

    it('should create a client with custom baseURL', () => {
      const client = new IntervalsClient({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.intervals.icu/api/v1',
      });

      expect(client).toBeDefined();
    });

    it('should create a client with custom timeout', () => {
      const client = new IntervalsClient({
        apiKey: 'test-api-key',
        timeout: 5000,
      });

      expect(client).toBeDefined();
    });

    it('should configure axios with correct defaults', () => {
      const mockInstance = {
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      
      mockedAxios.create = vi.fn(() => mockInstance);

      const client = new IntervalsClient({
        apiKey: 'test-api-key',
      });

      expect(client).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://intervals.icu/api/v1',
          timeout: 30000,
        })
      );
    });

    it('serializes array query params as repeated keys (no indexes/brackets)', () => {
      const client = new IntervalsClient({
        apiKey: 'test-api-key',
      });

      expect(client).toBeDefined();
      const createCall = mockedAxios.create.mock.calls[0][0];
      expect(createCall.paramsSerializer).toEqual({ indexes: null });
    });
  });

  describe('Error Handling', () => {
    let client: IntervalsClient;
    let mockInstance: any;
    let errorHandler: any;

    beforeEach(() => {
      mockInstance = {
        request: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { 
            use: vi.fn((successHandler, _errorHandler) => {
              mockInstance._successHandler = successHandler;
              errorHandler = _errorHandler;
            }),
            eject: vi.fn(),
          },
        },
        _successHandler: null as any,
      };

      // Make request method call error handler when rejected
      mockInstance.request.mockImplementation(async () => {
        throw new Error('This should be overridden in each test');
      });
      
      mockedAxios.create = vi.fn(() => mockInstance);

      client = new IntervalsClient({
        apiKey: 'test-api-key',
        athleteId: 'test-athlete-id',
      });
    });

    it('should throw IntervalsAPIError on 401 Unauthorized', async () => {
      const error = new Error('Request failed') as AxiosError;
      error.response = {
        status: 401,
        data: { error: 'Unauthorized' },
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };

      mockInstance.request.mockImplementation(async () => {
        throw await errorHandler(error);
      });

      await expect(client.athletes.getAthlete()).rejects.toThrow(IntervalsAPIError);
      await expect(client.athletes.getAthlete()).rejects.toThrow('authentication failed');
    });

    it('should throw IntervalsAPIError on 404 Not Found', async () => {
      const error = new Error('Not Found') as AxiosError;
      error.response = {
        status: 404,
        data: {},
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };

      mockInstance.request.mockImplementation(async () => {
        throw await errorHandler(error);
      });

      await expect(client.events.getEvent(99999)).rejects.toThrow(IntervalsAPIError);
      await expect(client.events.getEvent(99999)).rejects.toThrow('not found');
    });

    it('should throw IntervalsAPIError on 429 Rate Limit', async () => {
      // Use maxRetries: 0 to disable retry logic for this test
      const noRetryClient = new IntervalsClient({
        apiKey: 'test-api-key',
        athleteId: 'test-athlete-id',
        maxRetries: 0,
      });

      const error = new Error('Too Many Requests') as AxiosError;
      error.response = {
        status: 429,
        data: {},
        statusText: 'Too Many Requests',
        headers: {},
        config: {} as any,
      };

      mockInstance.request.mockImplementation(async () => {
        throw await errorHandler(error);
      });

      await expect(noRetryClient.athletes.getAthlete()).rejects.toThrow(IntervalsAPIError);
      await expect(noRetryClient.athletes.getAthlete()).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw IntervalsAPIError on 500 Server Error', async () => {
      const error = new Error('Server Error') as AxiosError;
      error.response = {
        status: 500,
        data: {},
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      mockInstance.request.mockImplementation(async () => {
        throw await errorHandler(error);
      });

      await expect(client.athletes.getAthlete()).rejects.toThrow(IntervalsAPIError);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network Error');

      mockInstance.request.mockImplementation(async () => {
        throw await errorHandler(error);
      });

      await expect(client.athletes.getAthlete()).rejects.toThrow(IntervalsAPIError);
    });
  });

  describe('Rate Limiting', () => {
    let client: IntervalsClient;
    let mockInstance: any;
    let successHandler: any;

    beforeEach(() => {
      mockInstance = {
        request: vi.fn(),
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { 
            use: vi.fn((_successHandler) => {
              successHandler = _successHandler;
              return 0;
            }),
            eject: vi.fn(),
          },
        },
      };
      
      mockedAxios.create = vi.fn(() => mockInstance);

      client = new IntervalsClient({
        apiKey: 'test-api-key',
      });
    });

    it('should track rate limit information from headers', async () => {
      const mockResponse = {
        data: { id: 'test' },
        headers: {
          'x-ratelimit-remaining': '98',
          'x-ratelimit-reset': '1640000000',
        },
      };

      mockInstance.request.mockImplementation(async () => {
        // Call success handler to trigger rate limit tracking
        successHandler(mockResponse);
        return mockResponse;
      });

      await client.athletes.getAthlete();

      const remaining = client.getRateLimitRemaining();
      const reset = client.getRateLimitReset();

      expect(remaining).toBe(98);
      expect(reset).toBeInstanceOf(Date);
    });

    it('should return undefined for rate limit before first request', () => {
      const remaining = client.getRateLimitRemaining();
      const reset = client.getRateLimitReset();

      expect(remaining).toBeUndefined();
      expect(reset).toBeUndefined();
    });
  });

  describe('IntervalsAPIError', () => {
    it('should create error with all properties', () => {
      const error = new IntervalsAPIError('Test error', 400, 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(IntervalsAPIError);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('IntervalsAPIError');
    });

    it('should create error without status and code', () => {
      const error = new IntervalsAPIError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.status).toBeUndefined();
      expect(error.code).toBeUndefined();
    });

    it('should be catchable as IntervalsAPIError', async () => {
      let errorHandler: any;
      const mockInstance = {
        request: vi.fn(),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { 
            use: vi.fn((successHandler, _errorHandler) => {
              errorHandler = _errorHandler;
            }),
            eject: vi.fn(),
          },
        },
      };
      
      mockedAxios.create = vi.fn(() => mockInstance);
      
      const testClient = new IntervalsClient({
        apiKey: 'test-api-key',
      });

      const axiosError = new Error('Test error') as AxiosError;
      axiosError.response = {
        status: 400,
        data: { message: 'Test error' },
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      mockInstance.request.mockImplementation(async () => {
        throw await errorHandler(axiosError);
      });

      try {
        await testClient.athletes.getAthlete();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(IntervalsAPIError);
        if (error instanceof IntervalsAPIError) {
          expect(error.status).toBe(400);
        }
      }
    });
  });

  describe('download and upload verbs', () => {
    let requestMock: any;
    beforeEach(() => {
      requestMock = vi.fn(async (config: any) => ({ data: Buffer.from('PK'), headers: {} }));
      const mockInstance = {
        request: requestMock,
        get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
        interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } },
      };
      mockedAxios.create = vi.fn(() => mockInstance);
    });

    it('download defaults to GET with no params when called with only a url', async () => {
      const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      await client.activities.downloadFile('a1');
      const call = requestMock.mock.calls[0][0];
      expect(call.method).toBe('GET');
      expect(call.url).toBe('/activity/a1/file');
      expect(call.params).toBeUndefined();
      expect(call.responseType).toBe('arraybuffer');
    });

    it('download keeps a query param literally named data or method in the query, never the body', async () => {
      const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      const http: any = (client as any).httpClient;
      await http.download('/x', { params: { data: 'raw', method: 'q' } });
      const call = requestMock.mock.calls[0][0];
      expect(call.method).toBe('GET');
      expect(call.params).toEqual({ data: 'raw', method: 'q' });
      expect(call.data).toBeUndefined();
    });

    it('download accepts URLSearchParams for repeated keys', async () => {
      const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      const http: any = (client as any).httpClient;
      const params = new URLSearchParams([['ids', 'a1'], ['ids', 'a2']]);
      await http.download('/x', { method: 'POST', params });
      const call = requestMock.mock.calls[0][0];
      expect(call.params).toBe(params);
    });

    it('download can POST with query params and no body', async () => {
      const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      const http: any = (client as any).httpClient;
      await http.download('/athlete/i1/download-fit-files', { method: 'POST', params: { ids: 'a1,a2' } });
      const call = requestMock.mock.calls[0][0];
      expect(call.method).toBe('POST');
      expect(call.params).toEqual({ ids: 'a1,a2' });
      expect(call.data).toBeUndefined();
      expect(call.responseType).toBe('arraybuffer');
    });

    it('download can POST a JSON body', async () => {
      const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      const http: any = (client as any).httpClient;
      await http.download('/download-workout.zwo', { method: 'POST', data: { name: 'w' } });
      const call = requestMock.mock.calls[0][0];
      expect(call.method).toBe('POST');
      expect(call.data).toEqual({ name: 'w' });
    });

    it('upload can PUT multipart', async () => {
      const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      const http: any = (client as any).httpClient;
      await http.upload({ url: '/activity/a1/streams.csv', file: Buffer.from('t,w\n1,2'), fileName: 's.csv', method: 'PUT' });
      const call = requestMock.mock.calls[0][0];
      expect(call.method).toBe('PUT');
      expect(call.url).toBe('/activity/a1/streams.csv');
      expect(call.data).toBeInstanceOf(FormData);
    });
  });
});
