import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { CourseClientService } from '../course-client/course-client.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ProgressStatus } from '@prisma/client';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly courseClient: CourseClientService,
  ) {}

  private buildLessonProgressData(course: Awaited<ReturnType<CourseClientService['getCourse']>>) {
    const data = course.modules
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((mod) =>
        mod.lessons
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((lesson, idx) => ({
            lessonId: lesson.id,
            status:
              !course.isSequential || (mod.sortOrder === 0 && idx === 0)
                ? ProgressStatus.IN_PROGRESS
                : ProgressStatus.LOCKED,
          })),
      );
    if (course.isSequential && data.length > 0) {
      data[0].status = ProgressStatus.IN_PROGRESS;
    }
    return data;
  }

  async enroll(studentId: string, dto: CreateEnrollmentDto) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: dto.courseId, studentId } },
    });
    if (existing) throw new ConflictException('Already enrolled in this course');

    const course = await this.courseClient.getCourse(dto.courseId);
    const lessonProgressData = this.buildLessonProgressData(course);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        courseId: dto.courseId,
        studentId,
        lessonProgresses: { create: lessonProgressData },
      },
      include: { lessonProgresses: true },
    });

    this.messaging.publishEvent('enrollment.created', {
      enrollmentId: enrollment.id,
      courseId: dto.courseId,
      studentId,
    });

    this.logger.log(`Student ${studentId} enrolled in course ${dto.courseId}`);
    return enrollment;
  }

  async enrollFromPayment(studentId: string, courseId: string, paymentId: string): Promise<void> {
    // Idempotency: same paymentId never creates a second enrollment
    const byPayment = await this.prisma.enrollment.findFirst({ where: { paymentId } });
    if (byPayment) {
      this.logger.warn(`Enrollment already exists for paymentId=${paymentId}, skipping`);
      return;
    }

    // Guard: already enrolled via other means — link the paymentId and return
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (existing) {
      if (!existing.paymentId) {
        await this.prisma.enrollment.update({ where: { id: existing.id }, data: { paymentId } });
      }
      this.logger.warn(`Student ${studentId} already enrolled in ${courseId}, linked paymentId`);
      return;
    }

    const course = await this.courseClient.getCourse(courseId);
    const lessonProgressData = this.buildLessonProgressData(course);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        courseId,
        studentId,
        paymentId,
        lessonProgresses: { create: lessonProgressData },
      },
      include: { lessonProgresses: true },
    });

    this.messaging.publishEvent('enrollment.created', {
      enrollmentId: enrollment.id,
      courseId,
      studentId,
    });

    this.logger.log(`Auto-enrolled student ${studentId} in course ${courseId} via payment ${paymentId}`);
  }

  async unenroll(enrollmentId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();

    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    this.logger.log(`Student ${studentId} unenrolled from enrollment ${enrollmentId}`);
  }

  async myEnrollments(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      orderBy: { enrolledAt: 'desc' },
    });

    const results = await Promise.all(
      enrollments.map(async (e) => {
        const courseInfo = await this.courseClient.getCourseBasic(e.courseId);
        return {
          ...e,
          course: courseInfo,
        };
      }),
    );

    return results;
  }

  async getEnrollment(enrollmentId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { lessonProgresses: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.studentId !== studentId) throw new ForbiddenException();
    return enrollment;
  }

  async getEnrollmentByCourse(courseId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      include: { lessonProgresses: true },
    });
    if (!enrollment) throw new NotFoundException('Not enrolled in this course');
    return enrollment;
  }

  async isEnrolled(courseId: string, studentId: string): Promise<boolean> {
    const count = await this.prisma.enrollment.count({
      where: { courseId, studentId },
    });
    return count > 0;
  }
}
