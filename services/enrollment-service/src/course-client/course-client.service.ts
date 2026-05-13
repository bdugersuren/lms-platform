import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface LessonInfo {
  id: string;
  title: string;
  sortOrder: number;
  moduleId: string;
  unlockNextOnPass: boolean;
}

export interface ModuleInfo {
  id: string;
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
  modules: ModuleInfo[];
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
}
