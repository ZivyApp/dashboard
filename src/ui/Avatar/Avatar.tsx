import styles from "./Avatar.module.css";

type Size = "md" | "lg";
type Tone = "blue" | "purple" | "green" | "orange" | "pink" | "brand";

interface AvatarProps {
  name: string;
  size?: Size;
  /**
   * Quando presente, deriva um tom de cor determinístico a partir desta chave
   * (ex.: userId) — pessoas diferentes ganham cores diferentes. Sem `colorKey`,
   * usa o tom brand padrão.
   */
  colorKey?: string;
}

const sizeClass: Record<Size, string> = {
  md: styles.md ?? "",
  lg: styles.lg ?? "",
};

// Paleta cíclica; cada tom mapeia para um par (bg/fg) de tokens existentes.
const TONES: readonly Tone[] = ["blue", "purple", "green", "orange", "pink", "brand"];
const toneClass: Record<Tone, string> = {
  blue: styles.toneBlue ?? "",
  purple: styles.tonePurple ?? "",
  green: styles.toneGreen ?? "",
  orange: styles.toneOrange ?? "",
  pink: styles.tonePink ?? "",
  brand: styles.toneBrand ?? "",
};

function toneFor(key: string): Tone {
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return TONES[sum % TONES.length] ?? "brand";
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, size = "md", colorKey }: AvatarProps) {
  const tone = colorKey !== undefined ? toneClass[toneFor(colorKey)] : "";
  const cls = [styles.avatar, sizeClass[size], tone].filter(Boolean).join(" ");
  return (
    <span className={cls} role="img" aria-label={name}>
      {initials(name)}
    </span>
  );
}
