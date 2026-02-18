interface ClaudeMarkProps {
  className?: string;
  size?: number;
}

export function ClaudeMark({ className, size = 24 }: ClaudeMarkProps) {
  return (
    <img
      src="/claude-color.svg"
      alt="Claude"
      width={size}
      height={size}
      className={className}
    />
  );
}
