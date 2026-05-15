# Quiz Service Architecture

## Overview

The Quiz Service is the core assessment engine of the LMS platform.

This service is responsible for:

- quizzes
- exams
- adaptive testing
- scoring
- attempts
- question banks
- progression validation
- anti-cheat mechanisms
- analytics events

The Quiz Service MUST remain isolated and independently scalable.

---

# Responsibilities

The Quiz Service MUST handle:

- quiz creation
- question management
- adaptive question selection
- answer validation
- scoring
- grading
- quiz progression
- time limits
- attempt tracking
- quiz analytics
- checkpoint validation

---

# Quiz Types

Supported quiz types:

- STANDARD
- ADAPTIVE
- PRACTICE
- EXAM
- CHECKPOINT
- ASSIGNMENT
- AI_EVALUATED

---

# Question Types

Supported question types:

- SINGLE_CHOICE
- MULTIPLE_CHOICE
- TRUE_FALSE
- ORDERING
- MATCHING
- SHORT_TEXT
- LONG_TEXT
- CODE
- DRAG_DROP

The system MUST be extensible for future question types.

---

# Adaptive Quiz System

The platform MUST support adaptive quizzes.

Adaptive quiz behavior:

- correct answer → harder question
- incorrect answer → easier question
- question difficulty balancing
- skill-based question routing
- dynamic progression

Adaptive logic MUST be configurable.

---

# Question Bank

Questions MUST belong to reusable question banks.

Question banks MUST support:

- categories
- tags
- difficulty levels
- skills
- learning objectives
- organizations
- teachers

Questions MUST be reusable across quizzes.

---

# Question Difficulty

Question difficulty MUST support:

- EASY
- MEDIUM
- HARD
- EXPERT

Difficulty MUST influence adaptive progression.

---

# Quiz Attempt Rules

Quiz attempts MUST support:

- attempt limits
- retry delays
- time limits
- cooldowns
- partial saving
- resume functionality

---

# Quiz Progression Rules

Quiz progression MUST support:

- sequential questions
- free navigation
- locked navigation
- section-based progression
- adaptive branching

---

# Blocking Logic

Quizzes MAY block:

- lesson progression
- module progression
- course completion

until passing criteria are met.

---

# Scoring System

The scoring engine MUST support:

- weighted questions
- partial scoring
- negative scoring
- adaptive scoring
- skill-based scoring
- cumulative scoring

---

# Passing Rules

Passing logic MUST support:

- minimum score
- required question correctness
- required sections
- mandatory checkpoints

---

# Anti-Cheat System

The platform MUST support anti-cheat mechanisms.

Examples:

- tab switching detection
- fullscreen enforcement
- suspicious activity logging
- randomized questions
- randomized answer ordering
- attempt logging
- IP tracking

Anti-cheat events MUST be auditable.

---

# AI Integration

The Quiz Service MUST support AI-assisted evaluation.

AI evaluation examples:

- essay grading
- short answer analysis
- coding evaluation
- feedback generation

AI evaluation MUST be asynchronous.

---

# Quiz Timer System

Quizzes MUST support:

- countdown timers
- pause rules
- timeout auto-submit
- section timers

---

# Checkpoint Quizzes

Interactive lessons MAY embed checkpoint quizzes.

Checkpoint quizzes MUST support:

- timestamp triggers
- page triggers
- paragraph triggers
- blocking progression
- instant evaluation

---

# Result Processing

Quiz completion MUST generate:

- score
- pass/fail result
- skill analysis
- weak topic analysis
- analytics events

---

# Analytics Events

Quiz events MUST be event-driven.

Example events:

- quiz.started
- quiz.submitted
- question.answered
- quiz.completed
- quiz.failed
- quiz.passed

RabbitMQ MUST be used for event publishing.

---

# Performance Requirements

The Quiz Service MUST support:

- high concurrency
- low latency
- partial saves
- caching
- horizontal scalability

This service is expected to experience traffic spikes during exams.

---

# Security Requirements

Students MUST NOT be able to:

- manipulate scores
- bypass timers
- modify answers
- access hidden questions
- submit invalid attempts

All scoring MUST be validated server-side.

---

# Database Architecture

The Quiz Service database MUST support:

- quizzes
- question banks
- question pools
- adaptive rules
- attempts
- answers
- scoring
- checkpoints
- analytics events

Use Prisma ORM consistently.

---

# Quiz Attempt Persistence

Quiz attempts MUST support:

- autosave
- resume after disconnect
- partial answer recovery
- recovery after refresh

---

# Event-Driven Architecture

The Quiz Service MUST publish events to RabbitMQ.

Examples:

- quiz.completed
- quiz.failed
- checkpoint.passed
- checkpoint.failed

Other services MAY subscribe to these events.

---

# Service Communication

The Quiz Service MAY communicate with:

- User Service
- Course Service
- AI Service
- Analytics Service

Communication rules:

- REST for synchronous requests
- RabbitMQ for async events

Direct database access between services is STRICTLY FORBIDDEN.

---

# Caching Strategy

Redis MUST be used for:

- active quiz sessions
- timers
- temporary state
- adaptive progression cache

---

# Distributed System Rule

Quiz attempt state MUST NOT rely entirely on memory.

The system MUST support:

- restart recovery
- distributed deployments
- multiple instances

---

# Important Architecture Rule

Quiz logic MUST remain isolated from frontend logic.

Frontend MUST NEVER calculate:

- scores
- pass/fail state
- progression
- unlock conditions

All critical logic MUST be validated server-side.

---

# Scalability Requirement

The Quiz Service MUST be horizontally scalable.

The architecture MUST support:

- multiple service replicas
- distributed quiz sessions
- Redis-based state synchronization

---

# Development Rules

The Quiz Service MUST follow:

- Clean Architecture
- SOLID Principles
- modular design
- event-driven architecture
- scalable engineering principles

---

# Technical Requirements

Required stack:

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- RabbitMQ

---

# Docker Requirements

The service MUST support:

- Docker
- Docker Compose
- Kubernetes migration readiness

---

# Logging Requirements

The Quiz Service MUST log:

- quiz attempts
- suspicious activity
- grading events
- scoring events
- progression events

Use structured logging only.

---

# Future Requirements

The architecture MUST remain extensible for:

- AI-generated quizzes
- multiplayer exams
- realtime quiz battles
- proctoring systems
- webcam monitoring
- voice analysis
- live exams

---

# Final Architecture Requirement

The Quiz Service MUST remain:

- scalable
- modular
- fault tolerant
- AI-ready
- event-driven
- production-ready

at all times.