import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EditGroupForm } from "./edit-group-form";

vi.mock("@/actions/group", () => ({
  updateGroup: vi.fn(),
}));

afterEach(cleanup);

describe("EditGroupForm", () => {
  it("renders the current group name and save action", () => {
    render(<EditGroupForm groupId="group-1" groupName="Crop Season 2026" />);

    expect(screen.getByLabelText("Group name")).toHaveValue("Crop Season 2026");
    expect(screen.getByRole("button", { name: "Rename group" })).toBeInTheDocument();
  });
});
