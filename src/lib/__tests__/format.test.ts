import { describe, it, expect } from "vitest";
import { formatINR } from "../format";

describe("formatINR", () => {
  it("formats a simple amount with Indian grouping", () => {
    // Indian numbering: 1,23,456.00
    const result = formatINR(123456);
    expect(result).toContain("1,23,456");
    expect(result).toContain("₹");
  });

  it("formats zero", () => {
    const result = formatINR(0);
    expect(result).toContain("0.00");
    expect(result).toContain("₹");
  });

  it("formats decimal amounts with two decimal places", () => {
    const result = formatINR(1234.5);
    expect(result).toContain("1,234.50");
  });

  it("formats small amounts", () => {
    const result = formatINR(99.99);
    expect(result).toContain("99.99");
  });

  it("formats large amounts with Indian grouping", () => {
    // 10,00,000 = 10 lakh
    const result = formatINR(1000000);
    expect(result).toContain("10,00,000");
  });

  it("handles negative amounts", () => {
    const result = formatINR(-500);
    expect(result).toContain("500");
    // Should have a negative indicator
    expect(result).toMatch(/-/);
  });
});
