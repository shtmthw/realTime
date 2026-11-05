export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="112" fill="var(--brand)" />
      <path
        d="M150 168c0-17.7 14.3-32 32-32h148c17.7 0 32 14.3 32 32v100c0 17.7-14.3 32-32 32h-88l-62 52c-4.2 3.5-10.6.5-10.6-5V300h-5.4c-17.7 0-32-14.3-32-32V168z"
        fill="#fff"
      />
      <circle cx="204" cy="218" r="17" fill="var(--brand)" />
      <circle cx="256" cy="218" r="17" fill="var(--brand)" />
      <circle cx="308" cy="218" r="17" fill="var(--brand)" />
    </svg>
  );
}
