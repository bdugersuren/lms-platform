-- =============================================================================
-- LMS Platform — PostgreSQL initialization
-- Creates one database per microservice. Each service owns its schema.
-- =============================================================================

-- Auth Service
CREATE DATABASE auth_db;

-- User Service
CREATE DATABASE user_db;

-- Course Service
CREATE DATABASE course_db;

-- Enrollment Service
CREATE DATABASE enrollment_db;

-- Quiz Service
CREATE DATABASE quiz_db;

-- Assignment Service
CREATE DATABASE assignment_db;

-- Wallet Service
CREATE DATABASE wallet_db;

-- Payment Service
CREATE DATABASE payment_db;

-- AI Service
CREATE DATABASE ai_db;

-- Notification Service
CREATE DATABASE notification_db;

-- Media Service
CREATE DATABASE media_db;

-- Certificate Service
CREATE DATABASE certificate_db;

-- Analytics Service
CREATE DATABASE analytics_db;

-- Grant the lms user full access to all databases
GRANT ALL PRIVILEGES ON DATABASE auth_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE user_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE course_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE enrollment_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE quiz_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE assignment_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE wallet_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE ai_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE media_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE certificate_db TO lms;
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO lms;
