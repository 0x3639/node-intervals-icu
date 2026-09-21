import type { IHttpClient } from '../core/http-client.interface.js';
import type { ActivitySearchResult } from '../types/index.js';

/**
 * Service for search operations
 */
export class SearchService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string
  ) {}

  /** Search activities by query string */
  async searchActivities(
    query: string,
    options?: { oldest?: string; newest?: string; limit?: number },
    athleteId?: string
  ): Promise<ActivitySearchResult[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<ActivitySearchResult[]>({
      method: 'GET',
      url: `/athlete/${id}/activities/search`,
      params: { q: query, ...options } as Record<string, unknown>,
    });
  }
}
