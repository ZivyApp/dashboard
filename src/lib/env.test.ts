import { describe, expect, it } from "vitest";
import { required } from "./assert-env";

describe("required", () => {
  it("retorna o valor quando definido", () => {
    expect(required("FOO", "bar")).toBe("bar");
  });

  it("lança erro quando undefined", () => {
    expect(() => required("FOO", undefined)).toThrow("Missing env var: FOO");
  });

  it("lança erro quando string vazia", () => {
    expect(() => required("FOO", "")).toThrow("Missing env var: FOO");
  });
});
