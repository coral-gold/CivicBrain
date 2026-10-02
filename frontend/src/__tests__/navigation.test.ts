import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/navigation";

describe("safeNext (AT-13)", () => {
  it("ignores absolute and protocol-relative URLs", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "http:evil.com", "/\\/evil.com", "/a\nb", ""]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined, "/admin/dashboard")).toBe("/admin/dashboard");
  });

  it("keeps same-site relative paths", () => {
    expect(safeNext("/complaints/12?x=1")).toBe("/complaints/12?x=1");
    expect(safeNext("/report")).toBe("/report");
  });
});
