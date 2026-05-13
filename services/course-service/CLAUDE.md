

# Interactive Learning System

## Overview

The LMS platform supports advanced interactive learning content.

Lessons are NOT passive content.

The platform MUST support:

- Interactive video lessons
- Interactive PDF lessons
- Interactive markdown lessons
- Interactive text lessons
- Embedded quizzes
- Content checkpoints
- Adaptive progression
- Sequential lesson unlocking
- AI-assisted learning interactions

The interactive learning engine is a core feature of the platform.

---

# Interactive Lesson Types

Supported lesson types:

- VIDEO
- PDF
- MARKDOWN
- TEXT
- LIVE
- QUIZ

Every lesson type MUST support interactive blocks.

---

# Interactive Blocks

Interactive blocks are embedded learning checkpoints inside lesson content.

Interactive blocks MAY include:

- quizzes
- checkpoints
- AI prompts
- informational overlays
- assignments

Interactive blocks MUST be attachable to:

- video timestamps
- PDF pages
- markdown sections
- text paragraphs

---

# Interactive Video Requirements

Interactive video lessons MUST support:

- timestamp-based quiz triggers
- pause on interaction
- resume after completion
- progress tracking
- mandatory checkpoints
- adaptive branching

Example:

- At 05:30 show quiz
- Student must answer correctly
- Video continues only after passing

---

# Interactive PDF Requirements

Interactive PDF lessons MUST support:

- page-based checkpoints
- embedded questions
- annotations
- highlights
- progression locking

Example:

- Quiz appears on page 5
- Student must pass before page 6 unlocks

---

# Interactive Markdown Requirements

Markdown lessons MUST support:

- interactive blocks between sections
- embedded quizzes
- collapsible sections
- code blocks
- AI prompts

---

# Interactive Text Requirements

Text lessons MUST support:

- paragraph-level interactions
- inline quizzes
- adaptive content
- AI-generated explanations

---

# Sequential Learning

The platform MUST support sequential learning flow.

Rules:

- lessons may remain locked
- lessons unlock only after prerequisite completion
- passing score may be required
- module progression may depend on cumulative score

---

# Lesson Unlock Logic

Lesson unlocking MUST support:

- prerequisite lessons
- minimum lesson score
- module completion
- adaptive recommendations
- teacher-defined conditions

---

# Adaptive Learning

The system MUST support adaptive learning behavior.

Example:

- incorrect answers → easier content
- correct answers → advanced content
- weak skill detection
- personalized recommendations

AI Service MUST assist adaptive learning logic.

---

# Progress Tracking

The platform MUST track:

- lesson progress
- video watch progress
- PDF reading progress
- interactive block completion
- quiz scores
- skill mastery
- learning time

Progress tracking MUST be resumable.

---

# Interactive Quiz Requirements

Interactive quizzes MUST support:

- single choice
- multiple choice
- ordering
- matching
- short answer
- AI-evaluated answers

Quizzes MUST support scoring rules.

---

# Blocking Progression

Interactive blocks MAY block progression.

Example:

- lesson pauses
- next section locked
- next lesson locked

until required score is achieved.

---

# Scoring System

The system MUST support:

- lesson scores
- module scores
- course scores
- weighted quizzes
- cumulative scoring
- passing thresholds

---

# AI Integration

AI features MUST support:

- essay evaluation
- adaptive recommendations
- skill graph generation
- weak area detection
- content recommendations
- AI tutoring

AI processing MUST be asynchronous.

---

# Interactive Content Architecture

Interactive lesson content MUST be modular.

Lessons MUST contain:

- content
- interactive blocks
- trigger points
- scoring rules
- unlock conditions

---

# Database Architecture

Interactive learning architecture MUST support:

- lesson dependencies
- interactive blocks
- question banks
- progress tracking
- adaptive progression
- event logging
- skill mapping

Use Prisma ORM models consistently.

---

# Frontend Requirements

Frontend interactive engine MUST support:

- real-time content locking
- interactive overlays
- progress persistence
- video checkpoint rendering
- dynamic lesson flow
- resume learning state

---

# Event-Driven Architecture

Interactive learning events MUST be event-driven.

Example events:

- lesson.started
- lesson.completed
- quiz.completed
- checkpoint.failed
- checkpoint.passed
- lesson.unlocked

RabbitMQ MUST be used for async processing.

---

# Performance Requirements

Interactive systems MUST support:

- lazy loading
- CDN delivery
- partial progress saving
- resumable playback
- efficient querying

---

# Security Requirements

Students MUST NOT be able to:

- bypass checkpoints
- fake lesson completion
- manipulate scores
- unlock lessons illegally

Progress validation MUST happen server-side.

---

# Important Architecture Rule

Interactive lesson progression logic MUST NEVER rely entirely on frontend validation.

All critical progression logic MUST be validated server-side.

---

# Important Development Rule

Interactive learning architecture MUST remain:

- scalable
- modular
- event-driven
- AI-ready
- extensible

at all times.




```
enum CourseStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum LessonType {
  VIDEO
  PDF
  MARKDOWN
  TEXT
  LIVE
  QUIZ
}

enum InteractiveBlockType {
  QUIZ
  CHECKPOINT
  INFO
  ASSIGNMENT
  AI_PROMPT
}

enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  TRUE_FALSE
  ORDERING
  MATCHING
  SHORT_TEXT
}

enum ProgressStatus {
  LOCKED
  IN_PROGRESS
  COMPLETED
}

model Course {
  id                  String           @id @default(uuid())
  organizationId      String
  teacherId           String

  title               String
  slug                String           @unique
  description         String
  thumbnailUrl        String?

  difficultyLevel     String?
  estimatedMinutes    Int?

  status              CourseStatus     @default(DRAFT)

  passingScore        Float            @default(60)

  isSequential        Boolean          @default(true)

  publishedAt         DateTime?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  modules             Module[]
  enrollments         CourseEnrollment[]

  @@index([organizationId])
  @@index([teacherId])
}

model Module {
  id                  String           @id @default(uuid())
  courseId            String

  title               String
  description         String?

  sortOrder           Int

  unlockScore         Float?

  createdAt           DateTime         @default(now())

  course              Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)

  lessons             Lesson[]

  @@index([courseId])
}

model Lesson {
  id                  String           @id @default(uuid())
  moduleId            String

  title               String
  description         String?

  lessonType          LessonType

  sortOrder           Int

  contentUrl          String?
  rawMarkdown         String?
  rawText             String?

  estimatedMinutes    Int?

  isPreview           Boolean          @default(false)

  passingScore        Float            @default(60)

  unlockNextOnPass    Boolean          @default(true)

  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  module              Module           @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  interactiveBlocks   InteractiveBlock[]
  progresses          LessonProgress[]

  @@index([moduleId])
}

model InteractiveBlock {
  id                      String                 @id @default(uuid())

  lessonId                String

  title                   String?

  blockType               InteractiveBlockType

  sortOrder               Int

  triggerSecond           Int?
  triggerPage             Int?
  triggerParagraph        Int?

  contentJson             Json

  isRequired              Boolean                @default(true)

  passingScore            Float?

  unlockNextContent       Boolean                @default(true)

  continueOnPassOnly      Boolean                @default(true)

  createdAt               DateTime               @default(now())

  lesson                  Lesson                 @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  questions               InteractiveQuestion[]
  progresses              InteractiveBlockProgress[]

  @@index([lessonId])
}

model InteractiveQuestion {
  id                      String                 @id @default(uuid())

  interactiveBlockId      String

  questionType            QuestionType

  questionText            String

  explanation             String?

  score                   Float                  @default(1)

  sortOrder               Int

  createdAt               DateTime               @default(now())

  interactiveBlock        InteractiveBlock       @relation(fields: [interactiveBlockId], references: [id], onDelete: Cascade)

  options                 InteractiveQuestionOption[]
  answers                 InteractiveAnswer[]

  @@index([interactiveBlockId])
}

model InteractiveQuestionOption {
  id                      String                 @id @default(uuid())

  questionId              String

  optionText              String

  isCorrect               Boolean                @default(false)

  sortOrder               Int

  question                InteractiveQuestion    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([questionId])
}

model CourseEnrollment {
  id                      String                 @id @default(uuid())

  courseId                String
  studentId               String

  progressPercent         Float                  @default(0)

  totalScore              Float                  @default(0)

  completed               Boolean                @default(false)

  enrolledAt              DateTime               @default(now())
  completedAt             DateTime?

  course                  Course                 @relation(fields: [courseId], references: [id], onDelete: Cascade)

  lessonProgresses        LessonProgress[]

  @@unique([courseId, studentId])
  @@index([studentId])
}

model LessonProgress {
  id                      String                 @id @default(uuid())

  enrollmentId            String

  lessonId                String

  status                  ProgressStatus         @default(LOCKED)

  progressPercent         Float                  @default(0)

  score                   Float                  @default(0)

  completed               Boolean                @default(false)

  unlockedAt              DateTime?
  completedAt             DateTime?

  createdAt               DateTime               @default(now())
  updatedAt               DateTime               @updatedAt

  enrollment              CourseEnrollment       @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  lesson                  Lesson                 @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  blockProgresses         InteractiveBlockProgress[]

  @@unique([enrollmentId, lessonId])
  @@index([lessonId])
}

model InteractiveBlockProgress {
  id                      String                 @id @default(uuid())

  lessonProgressId        String

  interactiveBlockId      String

  score                   Float                  @default(0)

  passed                  Boolean                @default(false)

  completed               Boolean                @default(false)

  attempts                Int                    @default(0)

  startedAt               DateTime               @default(now())
  completedAt             DateTime?

  lessonProgress          LessonProgress         @relation(fields: [lessonProgressId], references: [id], onDelete: Cascade)

  interactiveBlock        InteractiveBlock       @relation(fields: [interactiveBlockId], references: [id], onDelete: Cascade)

  answers                 InteractiveAnswer[]

  @@unique([lessonProgressId, interactiveBlockId])
}

model InteractiveAnswer {
  id                          String                      @id @default(uuid())

  interactiveBlockProgressId  String

  questionId                  String

  answerText                  String?

  selectedOptionIds           Json?

  isCorrect                   Boolean?

  scoreAwarded                Float                       @default(0)

  answeredAt                  DateTime                    @default(now())

  interactiveBlockProgress    InteractiveBlockProgress    @relation(fields: [interactiveBlockProgressId], references: [id], onDelete: Cascade)

  question                    InteractiveQuestion         @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([questionId])
}

model LessonDependency {
  id                          String      @id @default(uuid())

  lessonId                    String
  requiredLessonId            String

  createdAt                   DateTime    @default(now())

  @@unique([lessonId, requiredLessonId])
}

model Skill {
  id                          String      @id @default(uuid())

  name                        String
  category                    String?

  createdAt                   DateTime    @default(now())
}

model LessonSkill {
  id                          String      @id @default(uuid())

  lessonId                    String
  skillId                     String

  weight                      Float       @default(1)

  @@unique([lessonId, skillId])
}
```