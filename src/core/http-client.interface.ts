/**
 * HTTP Request configuration
 */
export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'stream';
}

/**
 * HTTP Response headers
 */
export interface HttpHeaders {
  [key: string]: unknown;
}

/**
 * Configuration for multipart file uploads
 */
export interface UploadConfig {
  url: string;
  file: Buffer | Blob | Uint8Array;
  fileName: string;
  params?: Record<string, unknown>;
  fieldName?: string;
  /** HTTP verb for the multipart request. Defaults to POST. */
  method?: 'POST' | 'PUT';
}

/** Options for binary downloads. */
export interface DownloadOptions {
  /** HTTP verb. Defaults to GET. */
  method?: 'GET' | 'POST';
  /** Query parameters. Use URLSearchParams when a key must repeat (e.g. `ids=a&ids=b`). */
  params?: Record<string, unknown> | URLSearchParams;
  /** JSON body, only meaningful with POST. */
  data?: unknown;
}

/**
 * Abstraction for HTTP client
 * Follows Dependency Inversion Principle - depend on abstractions, not concretions
 */
export interface IHttpClient {
  /**
   * Make an HTTP request
   */
  request<T>(config: HttpRequestConfig): Promise<T>;

  /**
   * Upload a file via multipart/form-data
   */
  upload<T>(config: UploadConfig): Promise<T>;

  /**
   * Download a file as a Buffer. Query parameters always go in `options.params`;
   * there is no positional params overload.
   */
  download(url: string, options?: DownloadOptions): Promise<Buffer>;
}
