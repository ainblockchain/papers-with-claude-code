interface ClaudeMarkProps {
  className?: string;
  size?: number;
}

export function ClaudeMark({ className, size = 24 }: ClaudeMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Claude's sparkle mark */}
      <path
        d="M12 2C12 2 14.5 8.5 16 10C17.5 11.5 22 12 22 12C22 12 17.5 12.5 16 14C14.5 15.5 12 22 12 22C12 22 9.5 15.5 8 14C6.5 12.5 2 12 2 12C2 12 6.5 11.5 8 10C9.5 8.5 12 2 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
