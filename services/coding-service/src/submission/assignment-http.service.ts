import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface LmsSubmissionResponse {
  data: { id: string };
}

interface LmsGradeResponse {
  data: { id: string };
}

@Injectable()
export class AssignmentHttpService {
  private readonly logger = new Logger(AssignmentHttpService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('ASSIGNMENT_SERVICE_URL');
  }

  async createSubmission(params: {
    assignmentId: string;
    studentId: string;
    content: string;
    token: string;
  }): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<LmsSubmissionResponse>(
        `${this.baseUrl}/api/assignments/${params.assignmentId}/submissions`,
        { content: params.content },
        { headers: { Authorization: `Bearer ${params.token}` } },
      ),
    );
    return res.data.data.id;
  }

  async gradeSubmission(params: {
    submissionId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    feedback: string;
    token: string;
  }): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<LmsGradeResponse>(
        `${this.baseUrl}/api/submissions/${params.submissionId}/grade`,
        {
          score: params.score,
          maxScore: params.maxScore,
          passed: params.passed,
          feedback: params.feedback,
        },
        { headers: { Authorization: `Bearer ${params.token}` } },
      ),
    );
    this.logger.log(`Graded LMS submission ${params.submissionId}: score=${params.score}`);
    return res.data.data.id;
  }
}
