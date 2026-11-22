
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AuthLayout from "./AuthLayout";

describe("AuthLayout", () => {
  it("renders the title, subtitle and children", () => {
    render(
      <MemoryRouter>
        <AuthLayout
          title="Test heading"
          subtitle="Test description"
        >
          <div>Test form content</div>
        </AuthLayout>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        name: "Test heading",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Test description")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Test form content")
    ).toBeInTheDocument();
  });
});
