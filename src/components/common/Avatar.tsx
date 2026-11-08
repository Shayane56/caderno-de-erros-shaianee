import { useId } from 'react';
import { cn } from '@/utils/cn';

interface AvatarProps {
  photo?: string | null;
  size?: number;
  className?: string;
  label?: string;
}

/** Avatar ilustrado feminino (substituível por fotografia nas configurações). */
export function Avatar({ photo, size = 96, className, label = 'Avatar' }: AvatarProps) {
  const uid = useId().replace(/:/g, '');
  if (photo) {
    return (
      <img
        src={photo}
        alt={label}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full object-cover ring-4 ring-surface', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full ring-4 ring-surface', className)}
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FCE7F3" />
          <stop offset="1" stopColor="#F9D5E5" />
        </linearGradient>
        <linearGradient id={`top-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E879A9" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${uid})`}>
        <rect width="120" height="120" fill={`url(#bg-${uid})`} />
        {/* brilhos discretos */}
        <circle cx="22" cy="28" r="2" fill="#FFFFFF" opacity="0.9" />
        <circle cx="98" cy="22" r="1.4" fill="#FFFFFF" opacity="0.8" />
        <circle cx="102" cy="44" r="2.2" fill="#FFFFFF" opacity="0.6" />
        {/* cabelo (atrás) */}
        <path
          d="M32 58c0-21 12-34 28-34s28 13 28 34c0 14 3 25 8 33-9 6-22 8-36 8s-27-2-36-8c5-8 8-19 8-33z"
          fill="#5B3A43"
        />
        {/* pescoço */}
        <path d="M52 74h16v14c0 4-4 7-8 7s-8-3-8-7z" fill="#EDBBA5" />
        {/* blusa */}
        <path d="M14 124c3-20 18-32 36-34 3 4 6 6 10 6s7-2 10-6c18 2 33 14 36 34z" fill={`url(#top-${uid})`} />
        <path d="M50 90c3 4 6 6 10 6s7-2 10-6" fill="none" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        {/* rosto */}
        <ellipse cx="60" cy="56" rx="18.5" ry="21" fill="#F6CDB9" />
        {/* orelhas e brincos */}
        <ellipse cx="41.5" cy="58" rx="3" ry="4.5" fill="#F0C1AB" />
        <ellipse cx="78.5" cy="58" rx="3" ry="4.5" fill="#F0C1AB" />
        <circle cx="41.5" cy="64.5" r="1.8" fill="#DB2777" />
        <circle cx="78.5" cy="64.5" r="1.8" fill="#DB2777" />
        {/* franja */}
        <path d="M40 54c1-17 10-26 22-26 11 0 19 8 19 22-8-1-17-6-22-14-3 8-10 15-19 18z" fill="#5B3A43" />
        <path d="M58 32c-2 6-6 11-11 14" fill="none" stroke="#7A4E5A" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        {/* olhos (sorrindo) */}
        <path d="M49 58.5c1.6-2 4.4-2 6 0" fill="none" stroke="#51434B" strokeWidth="2" strokeLinecap="round" />
        <path d="M65 58.5c1.6-2 4.4-2 6 0" fill="none" stroke="#51434B" strokeWidth="2" strokeLinecap="round" />
        {/* bochechas */}
        <ellipse cx="48.5" cy="65" rx="4" ry="2.4" fill="#E879A9" opacity="0.35" />
        <ellipse cx="71.5" cy="65" rx="4" ry="2.4" fill="#E879A9" opacity="0.35" />
        {/* sorriso */}
        <path d="M55.5 67.5c2.6 2.6 6.4 2.6 9 0" fill="none" stroke="#B4536F" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
