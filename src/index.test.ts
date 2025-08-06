import helloPackage from "./index";
import { describe, it, expect } from "vitest";

describe("index", () => {
  it("should return a string", () => {
    expect(helloPackage()).toBe("hello package!");
  });
});
