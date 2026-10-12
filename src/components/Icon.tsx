export function Icon({ name, fill, className = "", size }: { name: string; fill?: boolean; className?: string; size?: number }) {
  return (
    <span aria-hidden className={`ms ${fill ? "ms-fill" : ""} ${className}`} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}
