import { Search } from "lucide-react";
import styles from "./SearchBox.module.css";

export function SearchBox() {
  return (
    <div className={styles.wrap}>
      <Search className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        placeholder="Buscar chamados, moradores…"
        aria-label="Buscar"
        readOnly
        title="Busca global em breve"
      />
    </div>
  );
}
