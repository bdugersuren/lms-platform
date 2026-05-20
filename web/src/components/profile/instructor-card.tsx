'use client';

import { clsx } from 'clsx';
import { Avatar } from '@/components/user/avatar';
import type { PublicProfile } from '@/types/user';

interface InstructorCardProps {
  profile: PublicProfile;
  className?: string;
  locale?: string;
}

export function InstructorCard({ profile, className, locale = 'mn' }: InstructorCardProps) {
  const displayBio = profile.bio
    ? profile.bio.length > 120
      ? profile.bio.slice(0, 120) + '…'
      : profile.bio
    : null;

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-xl p-4 flex gap-4', className)}>
      <Avatar
        avatarUrl={profile.avatarUrl}
        displayName={profile.displayName}
        size="md"
        className="flex-shrink-0"
      />

      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{profile.displayName}</p>

        {profile.headline && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">{profile.headline}</p>
        )}

        {displayBio && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{displayBio}</p>
        )}

        {profile.expertise && profile.expertise.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.expertise.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium"
              >
                {tag}
              </span>
            ))}
            {profile.expertise.length > 4 && (
              <span className="text-xs text-gray-400">+{profile.expertise.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
