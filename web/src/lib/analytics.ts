type AnalyticsProps = Record<string, string | number | boolean | string[] | undefined | null>;

export function track(event: string, props?: AnalyticsProps): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Analytics]', event, props ?? {});
  }
  // Future: window.analytics?.track(event, props);
  // Future: send to /api/analytics for server-side event logging
}

// Named event constants keep call sites type-safe and refactorable
export const AnalyticsEvents = {
  PROFILE_UPDATED:             'profile_updated',
  PROFILE_COMPLETION_CHANGED:  'profile_completion_changed',
  ONBOARDING_BANNER_DISMISSED: 'onboarding_banner_dismissed',
  ONBOARDING_STEP_VIEWED:      'onboarding_step_viewed',
  CERTIFICATE_READINESS_SHOWN: 'certificate_readiness_shown',
} as const;
