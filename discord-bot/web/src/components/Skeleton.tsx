import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/[0.04] border border-white/[0.03] ${className}`}
    />
  );
};
