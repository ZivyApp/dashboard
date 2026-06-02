import type { AriaRole, ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  // Por padrão sem role (estado neutro). Telas de erro passam role="alert" para
  // que leitores de tela anunciem o conteúdo ao montar.
  role?: AriaRole;
}

export function EmptyState({ title, description, action, role }: EmptyStateProps) {
  return (
    <div className={styles.container} role={role}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {action}
    </div>
  );
}
