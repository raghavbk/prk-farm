import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OwnershipEditor } from "../ownership-editor";

afterEach(cleanup);

const twoMembers = [
  { userId: "a", email: "a@test.com", displayName: "Alice", ownershipPct: 50 },
  { userId: "b", email: "b@test.com", displayName: "Bob", ownershipPct: 50 },
];

describe("OwnershipEditor", () => {
  it("renders member names and percentage inputs", () => {
    render(<OwnershipEditor members={twoMembers} onChange={() => {}} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("shows total as 100% in green when valid", () => {
    render(<OwnershipEditor members={twoMembers} onChange={() => {}} />);

    expect(screen.getByText(/100\.00%/)).toBeInTheDocument();
  });

  it("shows total in red when not 100%", () => {
    const members = [
      { ...twoMembers[0], ownershipPct: 40 },
      { ...twoMembers[1], ownershipPct: 30 },
    ];

    render(<OwnershipEditor members={members} onChange={() => {}} />);

    expect(screen.getByText(/70\.00%/)).toBeInTheDocument();
    expect(screen.getByText(/must be 100%/)).toBeInTheDocument();
  });

  it("calls onChange when split equally is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<OwnershipEditor members={twoMembers} onChange={onChange} />);

    await user.click(screen.getByText("Split equally"));

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ownershipPct: 50 }),
        expect.objectContaining({ ownershipPct: 50 }),
      ])
    );
  });

  it("shows empty state when no members", () => {
    render(<OwnershipEditor members={[]} onChange={() => {}} />);

    expect(
      screen.getByText("Add members first to set ownership")
    ).toBeInTheDocument();
  });
});
