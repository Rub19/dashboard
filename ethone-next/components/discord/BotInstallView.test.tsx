import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BotInstallView from "./BotInstallView";
import * as botGuildIdsModule from "@/lib/hooks/useBotGuildIds";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...rest }: any) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock("@/components/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({
    setOpen: jest.fn(),
  }),
}));

jest.mock("@/components/SettingsProvider", () => ({
  useSettings: () => ({
    settings: { language: "fr" },
    update: jest.fn(),
  }),
}));

const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/components/ToastProvider", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    info: mockToastInfo,
    error: mockToastError,
  }),
}));

import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

describe("BotInstallView", () => {
  const dummyGuild: DiscordGuild = {
    id: "guild-123",
    name: "Mon Serveur Test",
    owner: true,
    permissions: "8",
    iconUrl: "",
  };

  const defaultProps = {
    guild: dummyGuild,
    onBack: jest.fn(),
    onBotDetected: jest.fn(),
    onSkip: jest.fn(),
    userName: "rub19",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders server name, breadcrumb, steps, and bot absent status", () => {
    render(<BotInstallView {...defaultProps} />);

    expect(screen.getByText("Installer Etho sur Mon Serveur Test")).toBeTruthy();
    expect(screen.getByText("Ajoute Etho au serveur")).toBeTruthy();
    expect(screen.getByText("Place son rôle tout en haut")).toBeTruthy();
    expect(screen.getByText("Reviens ici")).toBeTruthy();
    expect(screen.getByText("Etho absent")).toBeTruthy();
    expect(screen.getByText("Tout est enregistré")).toBeTruthy();
    expect(
      screen.getByText("La détection peut prendre quelques secondes après l'ajout du bot.")
    ).toBeTruthy();
  });

  it("configures the invite button with the guild ID and disable_guild_select param", () => {
    render(<BotInstallView {...defaultProps} />);

    const inviteLink = screen.getByRole("link", { name: /Ajouter Etho/i });
    expect(inviteLink).toBeTruthy();
    expect(inviteLink.getAttribute("href")).toContain("guild_id=guild-123");
    expect(inviteLink.getAttribute("href")).toContain("disable_guild_select=true");
    expect(inviteLink.getAttribute("target")).toBe("_blank");
  });

  it("calls onSkip when clicking the skip button", () => {
    const onSkipMock = jest.fn();
    render(<BotInstallView {...defaultProps} onSkip={onSkipMock} />);

    const skipButton = screen.getByRole("button", { name: /Passer l'attente/i });
    fireEvent.click(skipButton);

    expect(onSkipMock).toHaveBeenCalledTimes(1);
    expect(onSkipMock).toHaveBeenCalledWith(dummyGuild);
  });

  it("calls onBack when clicking Mes serveurs", () => {
    const onBackMock = jest.fn();
    render(<BotInstallView {...defaultProps} onBack={onBackMock} />);

    const backButton = screen.getByRole("button", { name: /Mes serveurs/i });
    fireEvent.click(backButton);

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("calls onBotDetected and shows toast when bot is detected upon clicking Vérifier", async () => {
    const onBotDetectedMock = jest.fn();
    jest.spyOn(botGuildIdsModule, "fetchBotPresence").mockResolvedValueOnce({
      present: ["guild-123"],
      status: 200,
    });

    render(<BotInstallView {...defaultProps} onBotDetected={onBotDetectedMock} />);

    const checkButton = screen.getByRole("button", { name: /Vérifier/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(onBotDetectedMock).toHaveBeenCalledWith(dummyGuild);
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it("shows informational toast when bot is not yet present upon clicking Vérifier", async () => {
    const onBotDetectedMock = jest.fn();
    jest.spyOn(botGuildIdsModule, "fetchBotPresence").mockResolvedValueOnce({
      present: [],
      status: 200,
    });

    render(<BotInstallView {...defaultProps} onBotDetected={onBotDetectedMock} />);

    const checkButton = screen.getByRole("button", { name: /Vérifier/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(onBotDetectedMock).not.toHaveBeenCalled();
      expect(mockToastInfo).toHaveBeenCalled();
    });
  });
});
