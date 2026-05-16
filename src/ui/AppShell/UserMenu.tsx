import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useSessionStore } from "@/stores/session";
import { clearActivityReads } from "@/features/activity/repository/local";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  const email = useSessionStore((s) => s.session?.user.email ?? "");
  const navigate = useNavigate();

  const initial = email.charAt(0).toUpperCase();

  async function handleSignOut() {
    try {
      await useSessionStore.getState().signOut();
    } catch (err) {
      console.error("signOut failed:", err);
    } finally {
      clearActivityReads();
      void navigate({ to: "/login" });
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Menu do usuário">
          {initial ? (
            <span className={styles.avatar} aria-hidden="true">
              {initial}
            </span>
          ) : (
            <User size={18} aria-hidden="true" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.content} align="end" sideOffset={8}>
          <div className={styles.emailHeader}>{email || "Usuário"}</div>
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Item className={styles.item} onSelect={() => void handleSignOut()}>
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
