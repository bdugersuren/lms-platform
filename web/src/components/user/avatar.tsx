'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
};

export function Avatar({ avatarUrl, displayName, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const letter = displayName.trim()[0]?.toUpperCase() ?? '?';

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (avatarUrl && !imgError) {
    return (
      <div className={clsx('relative rounded-full overflow-hidden flex-shrink-0', sizeClasses[size], className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={displayName}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        'bg-blue-600 text-white',
        sizeClasses[size],
        className,
      )}
    >
      {letter}
    </div>
  );
}
