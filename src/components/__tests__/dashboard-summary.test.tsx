import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DashboardSummary } from "../dashboard-summary";

afterEach(cleanup);

describe("DashboardSummary", () => {
  it("renders all three summary sections", () => {
    render(<DashboardSummary totalYouOwe={1500} totalOwedToYou={3000} />);

    expect(screen.getByText("You Owe")).toBeInTheDocument();
    expect(screen.getByText("Owed to You")).toBeInTheDocument();
    expect(screen.getByText("Net Balance")).toBeInTheDocument();
  });

  it("shows positive net balance label when owed more", () => {
    const { container } = render(
      <DashboardSummary totalYouOwe={1000} totalOwedToYou={5000} />
    );

    // Net balance card is the col-span-2 div
    const netCard = container.querySelector(".col-span-2")!;
    expect(netCard.textContent).toContain("owed to you");
  });

  it("shows negative net balance label when owing more", () => {
    const { container } = render(
      <DashboardSummary totalYouOwe={5000} totalOwedToYou={1000} />
    );

    const netCard = container.querySelector(".col-span-2")!;
    expect(netCard.textContent).toContain("you owe");
  });

  it("handles zero balances", () => {
    render(<DashboardSummary totalYouOwe={0} totalOwedToYou={0} />);

    expect(screen.getByText("You Owe")).toBeInTheDocument();
    expect(screen.getByText("Owed to You")).toBeInTheDocument();
  });
});
