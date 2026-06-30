import { getAccessToken } from './kilter-auth';

const BASE_URL = 'https://portal.kiltergrips.com/api';

export interface KilterClientOptions {
  timeout?: number;
}

class KilterClient {
  private timeout: number;

  constructor(options: KilterClientOptions = {}) {
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getAccessToken();
    const url = `${BASE_URL}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new Error('Unauthorized: token may be invalid');
      }

      if (!response.ok) {
        throw new Error(`Kilter API error: ${response.status}`);
      }

      const data = await response.json() as T;
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // NOTE: `/climbs/all/{uuid}` and `/climb-stat/all/{uuid}` are dead endpoints
  // (they return []). The real catalog lives behind PowerSync sync, but the
  // `/climbs/curated` REST endpoint exposes the full listed catalog
  // (~5.5k climbs) as { climbs, climbStats }, which is what the app uses here.
  //
  // The payload is ~1MB and takes several seconds upstream, so cache it in
  // memory with a TTL and de-duplicate concurrent fetches (single-flight).
  private catalogCache:
    | { data: { climbs: any[]; climbStats: any[] }; expiresAt: number }
    | null = null;
  private catalogInflight: Promise<{ climbs: any[]; climbStats: any[] }> | null =
    null;
  private catalogTtl = 10 * 60 * 1000;

  async getCuratedCatalog(): Promise<{ climbs: any[]; climbStats: any[] }> {
    if (this.catalogCache && this.catalogCache.expiresAt > Date.now()) {
      return this.catalogCache.data;
    }
    if (this.catalogInflight) {
      return this.catalogInflight;
    }
    this.catalogInflight = this.request<{ climbs: any[]; climbStats: any[] }>(
      `/climbs/curated`
    )
      .then((data) => {
        this.catalogCache = { data, expiresAt: Date.now() + this.catalogTtl };
        return data;
      })
      .finally(() => {
        this.catalogInflight = null;
      });
    return this.catalogInflight;
  }

  async getClimbDetail(uuid: string): Promise<any> {
    return this.request(`/climbs/${uuid}`);
  }

  async getClimbWithEdges(uuid: string): Promise<any> {
    return this.request(`/climbs/climbdetails/${uuid}`);
  }

  async getClimbFromCatalog(uuid: string): Promise<any | null> {
    const catalog = await this.getCuratedCatalog();

    const rawClimb = catalog.climbs.find((c: any) => c.climbUuid === uuid);
    if (!rawClimb) return null;

    const climb = {
      climb_uuid: rawClimb.climbUuid,
      climb_concat: rawClimb.climbConcat,
      name: rawClimb.name,
      description: rawClimb.description,
      edge_left: rawClimb.edgeLeft,
      edge_right: rawClimb.edgeRight,
      edge_bottom: rawClimb.edgeBottom,
      edge_top: rawClimb.edgeTop,
      frame_count: rawClimb.frameCount,
      frames_pace: rawClimb.framesPace,
      user_uuid: rawClimb.userUuid,
      username: rawClimb.username,
      product_name: rawClimb.productName,
      product_layout_uuid: rawClimb.productLayoutUuid,
      allow_match: rawClimb.allowMatch,
      is_draft: rawClimb.isDraft ? 1 : 0,
      is_listed: rawClimb.isListed ? 1 : 0,
      angle: rawClimb.angle ?? 0,
      created_at: rawClimb.createdAt,
      updated_at: rawClimb.updatedAt,
    };

    const rawStat = catalog.climbStats.find(
      (s: any) => s.climbUuid === uuid && (s.angle ?? 0) === (rawClimb.angle ?? 0)
    );

    if (rawStat) {
      return {
        ...climb,
        ascent_count: rawStat.ascentCount,
        current_difficulty_id: rawStat.currentDifficultyId,
        official_kilter_difficulty: rawStat.officialKilterDifficulty,
        difficulty_average: rawStat.difficultyAverage,
        quality_average: rawStat.qualityAverage,
        fa_username: rawStat.faUsername,
        fa_at: rawStat.faAt,
      };
    }

    return climb;
  }

  async getWalls(): Promise<any[]> {
    return this.request('/walls');
  }

  async getWallClimbCount(): Promise<Record<string, number>> {
    return this.request('/walls/climbcount');
  }

  async getUserProfile(uuid: string): Promise<any> {
    return this.request(`/users/${uuid}`);
  }

  async findUsers(query: string): Promise<any[]> {
    return this.request(`/users/find?q=${encodeURIComponent(query)}`);
  }

  async getClimbRatings(uuid: string): Promise<any> {
    return this.request(`/v2/climb-rating/${uuid}`);
  }

  async submitClimbRating(uuid: string, rating: number): Promise<any> {
    return this.request(`/v2/climb-rating`, {
      method: 'POST',
      body: JSON.stringify({ climb_uuid: uuid, rating }),
    });
  }

  async getLogs(page?: number, limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    return this.request(`/v2/logs${params.toString() ? '?' : ''}${params.toString()}`);
  }
}

export const kilterClient = new KilterClient();
