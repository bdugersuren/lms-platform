/**
 * Returns true when enrollment/progress writes have been cut over to enrollment-service.
 * Set ENROLLMENT_CUTOVER_ENABLED=true in the environment to enable.
 */
export function isEnrollmentCutoverEnabled(): boolean {
  return process.env.ENROLLMENT_CUTOVER_ENABLED === 'true';
}
