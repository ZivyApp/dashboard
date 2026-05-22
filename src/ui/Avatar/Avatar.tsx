import styles from "./Avatar.module.css";

type Size = "md" | "lg";

interface AvatarProps {
  name: string;
  size?: Size;
}

const sizeClass: Record<Size, string> = {
  md: styles.md ?? "",
  lg: styles.lg ?? "",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const cls = [styles.avatar, sizeClass[size]].filter(Boolean).join(" ");
  return (
    <span className={cls} role="img" aria-label={name}>
      {initials(name)}
    </span>
  );
}
