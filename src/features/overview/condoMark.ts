export function condoMark(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const first = words[0];
  if (!first) return "?";
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  const last = words[words.length - 1] ?? first;
  const a = first[0] ?? "";
  const b = last[0] ?? "";
  return (a + b).toUpperCase();
}
