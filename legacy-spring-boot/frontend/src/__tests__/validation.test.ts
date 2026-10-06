import { describe, expect, it } from "vitest";
import { ageOn, complaintTextSchema, profileSchema, signupSchema } from "@/lib/validation";

const base = { fullName: "Asha Patil", phone: "9123456789", gender: "FEMALE", dateOfBirth: "1990-01-01", wardNumber: 5 };
const errorsOf = (r: { success: boolean; error?: { issues: { path: (string | number)[] }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => String(i.path[0]));

describe("profile schema (AT-7)", () => {
  const schema = profileSchema(30);

  it("accepts a valid profile", () => expect(schema.safeParse(base).success).toBe(true));

  it("flags phone, age and ward together", () => {
    const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10);
    const r = schema.safeParse({ ...base, phone: "5123456789", dateOfBirth: tenYearsAgo, wardNumber: 0 });
    expect(errorsOf(r)).toEqual(expect.arrayContaining(["phone", "dateOfBirth", "wardNumber"]));
  });

  it("enforces ward upper bound and age upper bound", () => {
    expect(schema.safeParse({ ...base, wardNumber: 31 }).success).toBe(false);
    expect(schema.safeParse({ ...base, dateOfBirth: "1890-01-01" }).success).toBe(false);
  });

  it("computes age on the birthday boundary", () => {
    expect(ageOn("2000-06-15", new Date("2013-06-14T12:00:00Z"))).toBe(12);
    expect(ageOn("2000-06-15", new Date("2013-06-15T12:00:00Z"))).toBe(13);
  });
});

describe("other forms", () => {
  it("signup needs a name and a valid email", () => {
    expect(signupSchema.safeParse({ name: "A", email: "nope" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Asha", email: "a@b.in" }).success).toBe(true);
  });

  it("complaint description is 10–1000 chars", () => {
    expect(complaintTextSchema.safeParse({ description: "short" }).success).toBe(false);
    expect(complaintTextSchema.safeParse({ description: "x".repeat(1001) }).success).toBe(false);
    expect(complaintTextSchema.safeParse({ description: "Deep pothole near school" }).success).toBe(true);
  });
});
