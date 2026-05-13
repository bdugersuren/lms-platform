import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, ProgressStatus } from '@prisma/client';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async enroll(courseId: string, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new ForbiddenException('Course is not published');
    }

    const existing = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: user.sub } },
    });
    if (existing) throw new ConflictException('Already enrolled in this course');

    // Flatten all lessons in module order
    const allLessons = course.modules.flatMap((m) => m.lessons);

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.courseEnrollment.create({
        data: { courseId, studentId: user.sub },
      });

      if (allLessons.length > 0) {
        // Create all lesson progresses as LOCKED
        await tx.lessonProgress.createMany({
          data: allLessons.map((lesson) => ({
            enrollmentId: created.id,
            lessonId: lesson.id,
            status: ProgressStatus.LOCKED,
          })),
        });

        if (course.isSequential) {
          // Unlock only the first lesson
          await tx.lessonProgress.updateMany({
            where: {
              enrollmentId: created.id,
              lessonId: allLessons[0].id,
            },
            data: {
              status: ProgressStatus.IN_PROGRESS,
              unlockedAt: new Date(),
            },
          });
        } else {
          // Unlock all lessons for non-sequential courses
          await tx.lessonProgress.updateMany({
            where: { enrollmentId: created.id },
            data: {
              status: ProgressStatus.IN_PROGRESS,
              unlockedAt: new Date(),
            },
          });
        }
      }

      return created;
    });

    this.messaging.publishEvent('course.student.enrolled', {
      enrollmentId: enrollment.id,
      courseId,
      studentId: user.sub,
      courseTitle: course.title,
    });

    return ApiResponseBuilder.success(enrollment, 'Enrolled successfully');
  }

  async unenroll(courseId: string, user: JwtPayload) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: user.sub } },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    await this.prisma.courseEnrollment.delete({ where: { id: enrollment.id } });

    return ApiResponseBuilder.success(null, 'Unenrolled successfully');
  }

  async listEnrollments(courseId: string, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && course.instructorId !== user.sub) {
      throw new ForbiddenException('Access denied');
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
    });

    return ApiResponseBuilder.success(enrollments, 'Enrollments retrieved');
  }

  async myEnrollments(user: JwtPayload) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentId: user.sub },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            level: true,
            totalLessons: true,
            totalMinutes: true,
          },
        },
      },
    });

    return ApiResponseBuilder.success(enrollments, 'My enrollments retrieved');
  }

  async getEnrollment(enrollmentId: string, user: JwtPayload) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            totalLessons: true,
            isSequential: true,
          },
        },
        lessonProgresses: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            lessonId: true,
            status: true,
            progressPercent: true,
            score: true,
            completed: true,
            unlockedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && enrollment.studentId !== user.sub) {
      throw new ForbiddenException('Access denied');
    }

    return ApiResponseBuilder.success(enrollment, 'Enrollment retrieved');
  }
}
