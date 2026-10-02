import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Field from "@/components/Field";

describe("Field accessibility", () => {
  it("links label and error text to the input", () => {
    render(<Field label="Email ID" error="Enter a valid email address" />);
    const input = screen.getByLabelText("Email ID");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const errId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(errId)).toHaveTextContent("Enter a valid email address");
  });
});
