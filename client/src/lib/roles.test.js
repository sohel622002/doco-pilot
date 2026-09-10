import { describe, it, expect } from "vitest";
import { hasRole, canWrite, isOwner } from "./roles";

describe("hasRole", () => {
  it("ranks owner > operator > viewer", () => {
    expect(hasRole("owner", "viewer")).toBe(true);
    expect(hasRole("owner", "operator")).toBe(true);
    expect(hasRole("owner", "owner")).toBe(true);
    expect(hasRole("operator", "owner")).toBe(false);
    expect(hasRole("viewer", "operator")).toBe(false);
  });

  it("treats a missing role (still loading) as insufficient for anything", () => {
    expect(hasRole(undefined, "viewer")).toBe(false);
    expect(hasRole(null, "viewer")).toBe(false);
  });
});

describe("canWrite", () => {
  it("is true for operator and owner, false for viewer", () => {
    expect(canWrite("operator")).toBe(true);
    expect(canWrite("owner")).toBe(true);
    expect(canWrite("viewer")).toBe(false);
    expect(canWrite(undefined)).toBe(false);
  });
});

describe("isOwner", () => {
  it("is true only for owner", () => {
    expect(isOwner("owner")).toBe(true);
    expect(isOwner("operator")).toBe(false);
    expect(isOwner("viewer")).toBe(false);
  });
});
