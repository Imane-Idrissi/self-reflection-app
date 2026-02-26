interface LogoProps {
  size?: number;
  className?: string;
}

export function UnblurryMark({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
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
