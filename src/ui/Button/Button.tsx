import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary: styles.primary ?? "",
  secondary: styles.secondary ?? "",
  ghost: styles.ghost ?? "",
  danger: styles.danger ?? "",
};

const sizeClass: Record<Size, string> = {
  sm: styles.sm ?? "",
  md: styles.md ?? "",
  lg: styles.lg ?? "",
};

export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  const cls = [styles.button, variantClass[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...rest} />;
}
