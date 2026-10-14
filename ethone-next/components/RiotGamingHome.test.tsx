import { render } from "@testing-library/react";
import RiotGamingHome from "./RiotGamingHome";
import SettingsProvider from "./SettingsProvider";
import { ToastProvider } from "@/context/ToastContext";
import CompareWithFriendView from "./tracker/CompareWithFriendView";
import ValorantWeaponStatsCard from "./tracker/ValorantWeaponStatsCard";

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
    const { queryByText, getByText } = render(
      <SettingsProvider>
        <ToastProvider>
          <RiotGamingHome />
        </ToastProvider>
      </SettingsProvider>
    );

    expect(getByText("Analyze")).toBeTruthy();
    expect(queryByText("Mise à jour v2.4.0 — ETHONE Tactical")).toBeNull();
    expect(queryByText("Notes de version")).toBeNull();
  });

  it("renders CompareWithFriendView with empty props without crashing", () => {
    const { container } = render(
      <SettingsProvider>
        <ToastProvider>
          <CompareWithFriendView />
        </ToastProvider>
      </SettingsProvider>
    );
    expect(container).toBeTruthy();
  });

  it("renders ValorantWeaponStatsCard safely with empty and malformed matches", () => {
    const { container } = render(
      <ValorantWeaponStatsCard matches={[]} isEn={true} />
    );
    expect(container).toBeTruthy();
  });

  it("renders RiotGamingHome with ?tab=compare without crashing", () => {
    delete (window as any).location;
    window.location = new URL("https://ethone.dev/tracker/?tab=compare") as any;
    const { container } = render(
      <SettingsProvider>
        <ToastProvider>
          <RiotGamingHome />
        </ToastProvider>
      </SettingsProvider>
    );
    expect(container).toBeTruthy();
  });
});
