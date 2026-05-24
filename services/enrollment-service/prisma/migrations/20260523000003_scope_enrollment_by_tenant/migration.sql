DROP INDEX IF EXISTS "enrollments_course_id_student_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_tenant_id_course_id_student_id_key"
  ON "enrollments"("tenant_id", "course_id", "student_id");
