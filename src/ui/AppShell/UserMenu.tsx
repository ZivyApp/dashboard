import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { useSessionStore } from "@/stores/session";
import styles from "./UserMenu.module.css";

function UserIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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
            <UserIcon />
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
