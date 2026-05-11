import { type FormEvent, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { useSignIn } from "./useSignIn";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, isPending, error } = useSignIn();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const redirectValue = (search as Record<string, unknown>)["redirect"];
  const rawRedirect = typeof redirectValue === "string" ? redirectValue : "/";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await signIn(email, password);
    if (ok) {
      void navigate({ to: redirectTo });
    }
  }

  const errorId = "login-error";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Entrar</h1>
        <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              aria-invalid={error !== null ? "true" : undefined}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              aria-invalid={error !== null ? "true" : undefined}
              aria-describedby={error !== null ? errorId : undefined}
            />
          </div>
          {error !== null && (
            <p id={errorId} role="alert" className={styles.errorMessage}>
              {error}
            </p>
          )}
          <Button type="submit" className={styles.submitButton} disabled={isPending}>
            {isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
