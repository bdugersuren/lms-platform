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

  async enroll(studentId: string, dto: CreateEnrollmentDto) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: dto.courseId, studentId } },
    });
    if (existing) throw new ConflictException('Already enrolled in this course');

    const course = await this.courseClient.getCourse(dto.courseId);

    const lessonProgressData = course.modules
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

    // First lesson always unlocked regardless of module sortOrder for sequential courses
    if (course.isSequential && lessonProgressData.length > 0) {
      lessonProgressData[0].status = ProgressStatus.IN_PROGRESS;
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        courseId: dto.courseId,
        studentId,
        lessonProgresses: { create: lessonProgressData },
      },
      include: { lessonProgresses: true },
    });

    this.messaging.publishEvent('course.student.enrolled', {
      enrollmentId: enrollment.id,
      courseId: dto.courseId,
      studentId,
    });

    this.logger.log(`Student ${studentId} enrolled in course ${dto.courseId}`);
    return enrollment;
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
