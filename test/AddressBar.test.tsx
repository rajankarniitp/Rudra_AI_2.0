import React from "react";
import { render, fireEvent } from "@testing-library/react";
import AddressBar from "../src/components/AddressBar";

describe("AddressBar", () => {
  it("renders input and calls onNavigate on submit", () => {
    const handleNavigate = jest.fn();
    const { getByPlaceholderText, getByRole } = render(
      <AddressBar onNavigate={handleNavigate} value="" />
    );
    const input = getByPlaceholderText(/ask anything or navigate/i);
    fireEvent.change(input, { target: { value: "https://example.com" } });
    fireEvent.submit(input);
    expect(handleNavigate).toHaveBeenCalledWith("https://example.com");
  });
});
