import styles from "./Spinner.module.css";

interface SpinnerProps {
  fullPage?: boolean;
}

export function Spinner({ fullPage }: SpinnerProps) {
  const spinner = <div className={styles.spinner} role="status" aria-label="Carregando" />;

  if (fullPage) {
    return <div className={styles.fullPage}>{spinner}</div>;
  }

  return spinner;
}
