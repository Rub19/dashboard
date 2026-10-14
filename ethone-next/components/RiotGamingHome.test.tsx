import { render } from "@testing-library/react";
import RiotGamingHome from "./RiotGamingHome";
import SettingsProvider from "./SettingsProvider";
import { ToastProvider } from "@/context/ToastContext";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

describe("RiotGamingHome Render Test", () => {
  it("renders without crashing", () => {
    render(
      <SettingsProvider>
        <ToastProvider>
          <RiotGamingHome />
        </ToastProvider>
      </SettingsProvider>
    );
  });
});
