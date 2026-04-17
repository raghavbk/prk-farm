import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DashboardSummary } from "../dashboard-summary";

afterEach(cleanup);

describe("DashboardSummary", () => {
  it("renders all three stat cards", () => {
    render(<DashboardSummary totalYouOwe={1500} totalOwedToYou={3000} />);
    expect(screen.getByText("You Owe")).toBeInTheDocument();
    expect(screen.getByText("Owed to You")).toBeInTheDocument();
    expect(screen.getByText("Net Balance")).toBeInTheDocument();
  });

  it("shows positive net as success color", () => {
    const { container } = render(<DashboardSummary totalYouOwe={1000} totalOwedToYou={5000} />);
    expect(container.textContent).toContain("owed to you");
  });

  it("shows negative net label", () => {
    const { container } = render(<DashboardSummary totalYouOwe={5000} totalOwedToYou={1000} />);
    expect(container.textContent).toContain("you owe overall");
  });

  it("handles zero balances", () => {
    render(<DashboardSummary totalYouOwe={0} totalOwedToYou={0} />);
    expect(screen.getByText("You Owe")).toBeInTheDocument();
    expect(screen.getByText("Owed to You")).toBeInTheDocument();
  });
});
