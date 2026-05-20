import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface BlockQuestionOption {
  id: string;
  isCorrect: boolean;
}

export interface BlockQuestion {
  id: string;
  questionType: string;
  score: number;
  options: BlockQuestionOption[];
}

export interface BlockDefinition {
  id: string;
  passingScore: number | null;
  questions: BlockQuestion[];
}

export interface LessonInfo {
  id: string;
  title: string;
  sortOrder: number;
  moduleId: string;
  unlockNextOnPass: boolean;
  passingScore?: number;
  lessonType?: string;
}

export interface ModuleInfo {
  id: string;
  title?: string;
  sortOrder: number;
  lessons: LessonInfo[];
}

export interface CourseInfo {
  id: string;
  title: string;
  thumbnail: string | null;
  slug: string;
  isSequential: boolean;
  totalLessons: number;
  totalMinutes: number;
  instructorId?: string;
  price?: string;
  status?: string;
  contentVersion?: number;
  publishedAt?: string | null;
  modules: ModuleInfo[];
}

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  instructorId: string;
  status: string;
}

@Injectable()
export class CourseClientService {
  private readonly logger = new Logger(CourseClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('COURSE_SERVICE_URL', 'http://course-service:3003');
  }

  async getCourse(courseId: string): Promise<CourseInfo> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ data: CourseInfo }>(`${this.baseUrl}/api/courses/${courseId}`),
      );
      return resp.data.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new NotFoundException(`Course ${courseId} not found`);
      }
      this.logger.error(`Failed to fetch course ${courseId}`, err?.message);
      throw new ServiceUnavailableException('Course service unavailable');
    }
  }

  async getCourseBasic(courseId: string): Promise<{ id: string; title: string; thumbnail: string | null; slug: string; totalLessons: number; totalMinutes: number }> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ data: CourseInfo }>(`${this.baseUrl}/api/courses/${courseId}`),
      );
      const { id, title, thumbnail, slug, totalLessons, totalMinutes } = resp.data.data;
      return { id, title, thumbnail, slug, totalLessons, totalMinutes };
    } catch {
      // Return minimal info if course-service is down — don't break my-enrollments
      return { id: courseId, title: 'Unknown course', thumbnail: null, slug: '', totalLessons: 0, totalMinutes: 0 };
    }
  }

  async getBlock(blockId: string): Promise<BlockDefinition> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ data: BlockDefinition }>(`${this.baseUrl}/api/courses/blocks/${blockId}`),
      );
      return resp.data.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new NotFoundException(`Block ${blockId} not found`);
      }
      this.logger.error(`Failed to fetch block ${blockId}`, err?.message);
      throw new ServiceUnavailableException('Course service unavailable');
    }
  }

  async listPublishedCourseIds(page = 1, limit = 100): Promise<{ ids: string[]; total: number }> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ data: { items: CourseListItem[]; meta: { total: number } } }>(
          `${this.baseUrl}/api/courses?status=PUBLISHED&page=${page}&limit=${limit}`,
        ),
      );
      const items: CourseListItem[] = resp.data.data?.items ?? [];
      const total = resp.data.data?.meta?.total ?? items.length;
      return { ids: items.map((c: CourseListItem) => c.id), total };
    } catch (err: any) {
      this.logger.error('Failed to list published courses', err?.message);
      throw new ServiceUnavailableException('Course service unavailable');
    }
  }
}
