import { useId } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export function UnblurryMark({ size = 24, className = '' }: LogoProps) {
  const id = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <defs>
        <filter id={`blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <clipPath id={`left-${id}`}>
          <rect x="0" y="0" width="16" height="32" />
        </clipPath>
        <clipPath id={`right-${id}`}>
          <rect x="16" y="0" width="16" height="32" />
        </clipPath>
      </defs>

      {/* Blurred left half */}
      <circle
        cx="16" cy="16" r="11"
        fill="currentColor"
        clipPath={`url(#left-${id})`}
        filter={`url(#blur-${id})`}
      />

      {/* Sharp right half */}
      <circle
        cx="16" cy="16" r="11"
        fill="currentColor"
        clipPath={`url(#right-${id})`}
      />
    </svg>
  );
}

export function UnblurryLogo({ size = 24, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-[6px] ${className}`}>
      <UnblurryMark size={size} className="text-primary-500" />
      <span className="font-heading font-bold text-text-primary" style={{ fontSize: size * 0.75 }}>
        Unblurry
      </span>
    </span>
  );
}
