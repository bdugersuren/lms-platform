import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { CourseClientService } from '../course-client/course-client.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { ProgressStatus } from '@prisma/client';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly courseClient: CourseClientService,
  ) {}

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    studentId: string,
    dto: UpdateLessonProgressDto,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    const lessonProgress = await this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
    if (!lessonProgress) throw new NotFoundException('Lesson progress not found');
    if (lessonProgress.status === ProgressStatus.LOCKED) {
      throw new ForbiddenException('Lesson is locked');
    }

    const updated = await this.prisma.lessonProgress.update({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      data: {
        progressPercent: dto.progressPercent ?? lessonProgress.progressPercent,
        score: dto.score ?? lessonProgress.score,
        status: ProgressStatus.IN_PROGRESS,
      },
    });

    return updated;
  }

  async completeLesson(
    enrollmentId: string,
    lessonId: string,
    studentId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { lessonProgresses: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    const lessonProgress = enrollment.lessonProgresses.find(
      (lp) => lp.lessonId === lessonId,
    );
    if (!lessonProgress) throw new NotFoundException('Lesson progress not found');
    if (lessonProgress.status === ProgressStatus.LOCKED) {
      throw new ForbiddenException('Lesson is locked');
    }
    if (lessonProgress.completed) return lessonProgress;

    await this.prisma.lessonProgress.update({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      data: {
        status: ProgressStatus.COMPLETED,
        completed: true,
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    this.messaging.publishEvent('lesson.completed', {
      enrollmentId,
      courseId: enrollment.courseId,
      lessonId,
      studentId,
    });

    await this.unlockNextLesson(enrollment.courseId, enrollmentId, lessonId, enrollment.lessonProgresses);
    await this.recalculateEnrollmentProgress(enrollmentId);

    return this.prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
  }

  private async unlockNextLesson(
    courseId: string,
    enrollmentId: string,
    completedLessonId: string,
    allProgresses: { lessonId: string; status: ProgressStatus }[],
  ) {
    try {
      const course = await this.courseClient.getCourse(courseId);
      const allLessons = course.modules
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((m) => m.lessons.sort((a, b) => a.sortOrder - b.sortOrder));

      const completedLesson = allLessons.find((l) => l.id === completedLessonId);
      if (!completedLesson) return;

      const completedIdx = allLessons.indexOf(completedLesson);
      if (completedIdx === -1 || completedIdx >= allLessons.length - 1) return;

      if (!course.isSequential && !completedLesson.unlockNextOnPass) return;

      const nextLesson = allLessons[completedIdx + 1];
      const nextProgress = allProgresses.find((lp) => lp.lessonId === nextLesson.id);
      if (nextProgress?.status === ProgressStatus.LOCKED) {
        await this.prisma.lessonProgress.update({
          where: {
            enrollmentId_lessonId: { enrollmentId, lessonId: nextLesson.id },
          },
          data: { status: ProgressStatus.IN_PROGRESS, unlockedAt: new Date() },
        });
        this.logger.log(`Unlocked lesson ${nextLesson.id} for enrollment ${enrollmentId}`);
      }
    } catch (err) {
      this.logger.warn(`Could not unlock next lesson: ${(err as Error).message}`);
    }
  }

  private async recalculateEnrollmentProgress(enrollmentId: string) {
    const [enrollment, progresses] = await Promise.all([
      this.prisma.enrollment.findUnique({ where: { id: enrollmentId } }),
      this.prisma.lessonProgress.findMany({ where: { enrollmentId } }),
    ]);

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const total = progresses.length;
    if (total === 0) return;

    const completedCount = progresses.filter((lp) => lp.completed).length;
    const progressPercent = Math.round((completedCount / total) * 100);
    const allCompleted = completedCount === total;

    const totalScore =
      progresses.reduce((sum, lp) => sum + (lp.score ?? 0), 0) / total;

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent,
        totalScore: Math.round(totalScore * 100) / 100,
        completed: allCompleted,
        completedAt: allCompleted ? new Date() : null,
      },
    });

    if (allCompleted && !enrollment.completed) {
      let courseTitle: string | undefined;
      try {
        const course = await this.courseClient.getCourseBasic(enrollment.courseId);
        courseTitle = course.title;
      } catch (err) {
        this.logger.warn(`Could not fetch course title for certificate event: ${(err as Error).message}`);
      }

      this.messaging.publishEvent('enrollment.completed', {
        enrollmentId,
        courseId: enrollment.courseId,
        userId: enrollment.studentId,
        studentId: enrollment.studentId,
        courseTitle,
        completedAt: updatedEnrollment.completedAt?.toISOString() ?? new Date().toISOString(),
      });
    }
  }

  async getProgress(enrollmentId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        lessonProgresses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();
    return enrollment;
  }
}
