import styles from "./Spinner.module.css";

interface SpinnerProps {
  fullPage?: boolean;
}

export function Spinner({ fullPage }: SpinnerProps) {
  const spinner = (
    <div className={styles.spinner} role="status" aria-label="Carregando">
      <span
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          borderWidth: "0",
        }}
      >
        Carregando…
      </span>
    </div>
  );

  if (fullPage) {
    return <div className={styles.fullPage}>{spinner}</div>;
  }

  return spinner;
}
