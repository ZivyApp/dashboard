import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";

/**
 * `expect.any(Function)` é tipado como `any` pelo vitest; este helper o devolve
 * como `unknown` para satisfazer no-unsafe-assignment sem mudar a semântica do
 * matcher (útil ao casar callbacks dentro de objectContaining/toMatchObject).
 */
export function anyFn(): unknown {
  return expect.any(Function);
}
