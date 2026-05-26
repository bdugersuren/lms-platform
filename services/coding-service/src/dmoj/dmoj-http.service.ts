import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

export interface DmojSubmissionResult {
  id: number;
  problem: string;
  user: string;
  language: string;
  status: string;     // 'QU' | 'G' | 'D' | 'IE' | 'CE' | ...
  result: string;     // 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | ...
  score: number;
  max_score: number;
  time: number | null;
  memory: number | null;
  cases: DmojCaseResult[];
}

export interface DmojCaseResult {
  type: string;
  case: number;
  status: string;
  time: number;
  memory: number;
  points: number;
  total: number;
}

interface DmojSubmissionResponse {
  object: DmojSubmissionResult;
}

@Injectable()
export class DmojHttpService implements OnModuleInit {
  private readonly logger = new Logger(DmojHttpService.name);
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('DMOJ_BASE_URL');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.get('/api/v2/');
      this.logger.log(`DMOJ reachable at ${this.baseUrl}`);
    } catch {
      this.logger.warn(`DMOJ not reachable at ${this.baseUrl} — submissions will queue`);
    }
  }

  async submitCode(params: {
    problem: string;
    language: string;
    source: string;
    user?: string;
  }): Promise<number> {
    const token = await this.getToken();
    const res = await this.post<{ id: number }>('/api/v2/submission/', {
      problem: params.problem,
      language: params.language,
      source: params.source,
      ...(params.user && { user: params.user }),
    }, { headers: { Authorization: `Bearer ${token}` } });
    return res.id;
  }

  async getSubmission(submissionId: number): Promise<DmojSubmissionResult | null> {
    try {
      const res = await this.get<DmojSubmissionResponse>(`/api/v2/submission/${submissionId}/`);
      return res.object;
    } catch {
      return null;
    }
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;

    const email = this.config.getOrThrow<string>('CODING_SERVICE_ACCOUNT_EMAIL');
    const password = this.config.getOrThrow<string>('CODING_SERVICE_ACCOUNT_PASSWORD');
    const authUrl = this.config.getOrThrow<string>('AUTH_SERVICE_URL');

    const res = await firstValueFrom(
      this.http.post<{ data: { accessToken: string } }>(
        `${authUrl}/api/auth/login`,
        { email, password },
      ),
    );

    this.accessToken = res.data.data.accessToken;
    this.tokenExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    return this.accessToken;
  }

  private async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.get<T>(`${this.baseUrl}${path}`, config),
      );
      return res.data;
    } catch (err) {
      this.logger.error(`DMOJ GET ${path} failed`, err);
      throw new ServiceUnavailableException('DMOJ judge unavailable');
    }
  }

  private async post<T>(path: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.post<T>(`${this.baseUrl}${path}`, data, config),
      );
      return res.data;
    } catch (err) {
      this.logger.error(`DMOJ POST ${path} failed`, err);
      throw new ServiceUnavailableException('DMOJ judge unavailable');
    }
  }
}
