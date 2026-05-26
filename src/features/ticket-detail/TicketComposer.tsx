import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import styles from "./TicketComposer.module.css";

interface TicketComposerProps {
  onSubmit: (text: string, opts: { onSuccess: () => void }) => void;
  isPending: boolean;
}

export function TicketComposer({ onSubmit, isPending }: TicketComposerProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function handlePublish() {
    if (!trimmed) return;
    onSubmit(trimmed, { onSuccess: () => setText("") });
  }

  return (
    <div className={styles.composer}>
      <textarea
        className={styles.textarea}
        placeholder="Adicionar comentário…"
        aria-label="Adicionar comentário"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isPending}
      />
      <div className={styles.footer}>
        <Button size="sm" disabled={!trimmed || isPending} onClick={handlePublish}>
          <Send size={12} aria-hidden="true" />
          {isPending ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </div>
  );
}
