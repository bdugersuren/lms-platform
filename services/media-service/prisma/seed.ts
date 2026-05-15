import { PrismaClient, MediaType, MediaStatus, TranscodeStatus, TranscodeFormat } from '@prisma/client';

const prisma = new PrismaClient();

const U = {
  INSTRUCTOR_1: 'a0000001-0000-0000-0000-000000000003',
  INSTRUCTOR_2: 'a0000001-0000-0000-0000-000000000004',
};

async function main() {
  console.log('Seeding media-service...');

  const mediaFiles = [
    // Course 1 videos
    {
      id: 'mf000001-0000-0000-0000-000000000001',
      userId: U.INSTRUCTOR_1,
      key: 'courses/c1/intro-typescript.mp4',
      url: 'https://storage.lms.mn/lms-media/courses/c1/intro-typescript.mp4',
      originalName: 'intro-typescript.mp4',
      mimeType: 'video/mp4',
      mediaType: MediaType.VIDEO,
      size: BigInt(125829120),
      status: MediaStatus.READY,
      title: 'TypeScript гэж юу вэ? (танилцуулга)',
      duration: 1215,
      width: 1920,
      height: 1080,
      thumbnail: 'https://storage.lms.mn/lms-media/courses/c1/intro-typescript-thumb.jpg',
      bucket: 'lms-media',
    },
    {
      id: 'mf000001-0000-0000-0000-000000000002',
      userId: U.INSTRUCTOR_1,
      key: 'courses/c1/types-variables.mp4',
      url: 'https://storage.lms.mn/lms-media/courses/c1/types-variables.mp4',
      originalName: 'types-variables.mp4',
      mimeType: 'video/mp4',
      mediaType: MediaType.VIDEO,
      size: BigInt(188743680),
      status: MediaStatus.READY,
      title: 'Хувьсагч ба өгөгдлийн төрөл',
      duration: 1823,
      width: 1920,
      height: 1080,
      thumbnail: 'https://storage.lms.mn/lms-media/courses/c1/types-variables-thumb.jpg',
      bucket: 'lms-media',
    },
    {
      id: 'mf000001-0000-0000-0000-000000000003',
      userId: U.INSTRUCTOR_1,
      key: 'courses/c1/generic-types.mp4',
      url: 'https://storage.lms.mn/lms-media/courses/c1/generic-types.mp4',
      originalName: 'generic-types.mp4',
      mimeType: 'video/mp4',
      mediaType: MediaType.VIDEO,
      size: BigInt(209715200),
      status: MediaStatus.READY,
      title: 'Generic type',
      duration: 2105,
      width: 1920,
      height: 1080,
      thumbnail: 'https://storage.lms.mn/lms-media/courses/c1/generic-types-thumb.jpg',
      bucket: 'lms-media',
    },
    // Course 2 videos
    {
      id: 'mf000001-0000-0000-0000-000000000004',
      userId: U.INSTRUCTOR_1,
      key: 'courses/c2/nestjs-architecture.mp4',
      url: 'https://storage.lms.mn/lms-media/courses/c2/nestjs-architecture.mp4',
      originalName: 'nestjs-architecture.mp4',
      mimeType: 'video/mp4',
      mediaType: MediaType.VIDEO,
      size: BigInt(167772160),
      status: MediaStatus.READY,
      title: 'NestJS архитектур',
      duration: 1843,
      width: 1920,
      height: 1080,
      thumbnail: 'https://storage.lms.mn/lms-media/courses/c2/nestjs-architecture-thumb.jpg',
      bucket: 'lms-media',
    },
    // Course 3 videos
    {
      id: 'mf000001-0000-0000-0000-000000000005',
      userId: U.INSTRUCTOR_2,
      key: 'courses/c3/docker-install.mp4',
      url: 'https://storage.lms.mn/lms-media/courses/c3/docker-install.mp4',
      originalName: 'docker-install.mp4',
      mimeType: 'video/mp4',
      mediaType: MediaType.VIDEO,
      size: BigInt(83886080),
      status: MediaStatus.READY,
      title: 'Docker суулгах',
      duration: 1203,
      width: 1920,
      height: 1080,
      thumbnail: 'https://storage.lms.mn/lms-media/courses/c3/docker-install-thumb.jpg',
      bucket: 'lms-media',
    },
    // PDF materials
    {
      id: 'mf000001-0000-0000-0000-000000000006',
      userId: U.INSTRUCTOR_1,
      key: 'courses/c1/typescript-cheatsheet.pdf',
      url: 'https://storage.lms.mn/lms-media/courses/c1/typescript-cheatsheet.pdf',
      originalName: 'typescript-cheatsheet.pdf',
      mimeType: 'application/pdf',
      mediaType: MediaType.PDF,
      size: BigInt(2097152),
      status: MediaStatus.READY,
      title: 'TypeScript Cheat Sheet',
      bucket: 'lms-media',
    },
    {
      id: 'mf000001-0000-0000-0000-000000000007',
      userId: U.INSTRUCTOR_2,
      key: 'courses/c3/docker-compose-reference.pdf',
      url: 'https://storage.lms.mn/lms-media/courses/c3/docker-compose-reference.pdf',
      originalName: 'docker-compose-reference.pdf',
      mimeType: 'application/pdf',
      mediaType: MediaType.PDF,
      size: BigInt(3145728),
      status: MediaStatus.READY,
      title: 'Docker Compose Reference',
      bucket: 'lms-media',
    },
  ];

  for (const mf of mediaFiles) {
    await prisma.mediaFile.upsert({
      where:  { key: mf.key },
      update: {},
      create: mf,
    });
  }
  console.log(`  ✓ ${mediaFiles.length} media files (5 video, 2 PDF)`);

  // ── Transcode Jobs for video files ─────────────────────────────────────────
  const videoIds = [
    'mf000001-0000-0000-0000-000000000001',
    'mf000001-0000-0000-0000-000000000004',
    'mf000001-0000-0000-0000-000000000005',
  ];

  let tcIdx = 1;
  for (const mediaFileId of videoIds) {
    await prisma.transcodeJob.upsert({
      where:  { id: `tc${String(tcIdx).padStart(6, '0')}-0000-0000-0000-000000000001` },
      update: {},
      create: {
        id: `tc${String(tcIdx).padStart(6, '0')}-0000-0000-0000-000000000001`,
        mediaFileId,
        format: TranscodeFormat.MP4_720P,
        status: TranscodeStatus.DONE,
        outputKey: `${mediaFileId}/720p.mp4`,
        outputUrl: `https://storage.lms.mn/lms-media/${mediaFileId}/720p.mp4`,
        startedAt: new Date('2026-04-01'),
        completedAt: new Date('2026-04-01'),
      },
    });
    tcIdx++;
  }
  console.log('  ✓ 3 transcode jobs (720p)');

  // ── Subtitles ──────────────────────────────────────────────────────────────
  const subtitles = [
    {
      id: 'sub00001-0000-0000-0000-000000000001',
      mediaFileId: 'mf000001-0000-0000-0000-000000000001',
      language: 'mn',
      label: 'Монгол',
      key: 'courses/c1/intro-typescript.mn.vtt',
      url: 'https://storage.lms.mn/lms-media/courses/c1/intro-typescript.mn.vtt',
    },
    {
      id: 'sub00001-0000-0000-0000-000000000002',
      mediaFileId: 'mf000001-0000-0000-0000-000000000001',
      language: 'en',
      label: 'English',
      key: 'courses/c1/intro-typescript.en.vtt',
      url: 'https://storage.lms.mn/lms-media/courses/c1/intro-typescript.en.vtt',
    },
  ];

  for (const sub of subtitles) {
    await prisma.subtitle.upsert({
      where:  { key: sub.key },
      update: {},
      create: sub,
    });
  }
  console.log('  ✓ 2 subtitles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
