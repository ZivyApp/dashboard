import { describe, expect, it, vi, afterEach } from "vitest";
import { safeStorage } from "./safeStorage";

describe("safeStorage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("getItem", () => {
    it("returns value when localStorage works", () => {
      // jsdom localStorage methods are non-configurable, so spy on Storage.prototype
      const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue("stored-value");

      const result = safeStorage.getItem("my-key");

      expect(result).toBe("stored-value");
      expect(spy).toHaveBeenCalledWith("my-key");
    });

    it("returns null when localStorage.getItem throws (Safari Private Browsing)", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("SecurityError");
      });

      const result = safeStorage.getItem("my-key");

      expect(result).toBeNull();
    });
  });

  describe("setItem", () => {
    it("stores value when localStorage works", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => undefined);

      safeStorage.setItem("my-key", "my-value");

      expect(spy).toHaveBeenCalledWith("my-key", "my-value");
    });

    it("silently swallows when localStorage.setItem throws", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("SecurityError");
      });

      expect(() => safeStorage.setItem("my-key", "my-value")).not.toThrow();
    });
  });

  describe("removeItem", () => {
    it("removes value when localStorage works", () => {
      const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => undefined);

      safeStorage.removeItem("my-key");

      expect(spy).toHaveBeenCalledWith("my-key");
    });

    it("silently swallows when localStorage.removeItem throws", () => {
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new DOMException("SecurityError");
      });

      expect(() => safeStorage.removeItem("my-key")).not.toThrow();
    });
  });
});
