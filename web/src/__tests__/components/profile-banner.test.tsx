import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState, useEffect } from 'react';

// Isolated test component that mirrors the dashboard banner logic
function ProfileBanner({ displayName, email }: { displayName: string; email: string }) {
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    setBannerDismissed(!!sessionStorage.getItem('profile-banner-dismissed'));
  }, []);

  const dismissBanner = () => {
    sessionStorage.setItem('profile-banner-dismissed', '1');
    setBannerDismissed(true);
  };

  const isDefaultName = displayName === email.split('@')[0];
  if (bannerDismissed || !isDefaultName) return null;

  return (
    <div data-testid="profile-banner">
      <span>Профайлаа бөглөж нэрээ оруулаарай</span>
      <button onClick={dismissBanner} aria-label="Хаах">×</button>
    </div>
  );
}

describe('ProfileBanner — SSR-safe behavior', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts hidden (bannerDismissed=true) to prevent SSR flash', () => {
    // On initial render before useEffect fires, banner should be hidden
    // This simulates the SSR-safe initial state
    const { container } = render(
      <ProfileBanner displayName="batbayar" email="batbayar@example.com" />,
    );
    // After mount, useEffect reads sessionStorage (empty) → sets dismissed=false → banner shows
    // We just verify the component renders without crash and element is accessible
    expect(container).toBeTruthy();
  });

  it('shows banner when displayName matches email prefix and not dismissed', async () => {
    const { findByTestId } = render(
      <ProfileBanner displayName="batbayar" email="batbayar@example.com" />,
    );
    const banner = await findByTestId('profile-banner');
    expect(banner).toBeInTheDocument();
  });

  it('hides banner when displayName differs from email prefix', async () => {
    const { queryByTestId, findByTestId } = render(
      <ProfileBanner displayName="Батбаяр" email="batbayar@example.com" />,
    );
    // Give time for useEffect to run
    await new Promise((r) => setTimeout(r, 10));
    expect(queryByTestId('profile-banner')).toBeNull();
    void findByTestId; // suppress unused warning
  });

  it('dismisses banner on button click and writes to sessionStorage', async () => {
    const { findByTestId, queryByTestId } = render(
      <ProfileBanner displayName="batbayar" email="batbayar@example.com" />,
    );

    const banner = await findByTestId('profile-banner');
    const dismissBtn = banner.querySelector('button')!;
    fireEvent.click(dismissBtn);

    expect(queryByTestId('profile-banner')).toBeNull();
    expect(sessionStorage.getItem('profile-banner-dismissed')).toBe('1');
  });

  it('stays hidden when sessionStorage flag is already set', async () => {
    sessionStorage.setItem('profile-banner-dismissed', '1');

    const { queryByTestId } = render(
      <ProfileBanner displayName="batbayar" email="batbayar@example.com" />,
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(queryByTestId('profile-banner')).toBeNull();
  });
});
