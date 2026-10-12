import { render, screen, fireEvent, act } from "@testing-library/react";
import MailBodyViewer, { sanitizeEmailHtml, isSafeUrl } from "./MailBodyViewer";
import type { MailMessage } from "@/lib/hooks/useMail";

describe("sanitizeEmailHtml", () => {
  it("conserve la structure des tableaux, cellules et dimensions", () => {
    const input = '<table width="600" cellpadding="0" cellspacing="0"><tr><td width="300" style="color: red;">Cellule 1</td><td width="300">Cellule 2</td></tr></table>';
    const output = sanitizeEmailHtml(input);
    expect(output).toContain("<table");
    expect(output).toContain('width="600"');
    expect(output).toContain("<td");
    expect(output).toContain('width="300"');
    expect(output).toContain("Cellule 1");
    expect(output).toContain("Cellule 2");
  });

  it("supprime les scripts, attributs on* et liens javascript", () => {
    const input = '<div><script>alert("xss")</script><p onclick="doSomething()">Texte</p><a href="javascript:alert(1)">Lien</a><img src="x" onerror="fail()"></div>';
    const output = sanitizeEmailHtml(input);
    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("javascript:");
    expect(output).toContain("Texte");
  });

  it("garde les images valides avec leurs dimensions", () => {
    const input = '<img src="https://images.ethone.dev/logo.png" width="120" height="40" alt="Claude">';
    const output = sanitizeEmailHtml(input);
    expect(output).toContain('src="https://images.ethone.dev/logo.png"');
    expect(output).toContain('referrerpolicy="no-referrer"');
    expect(output).toContain('loading="eager"');
    expect(output).toContain('width="120"');
    expect(output).toContain('height="40"');
    expect(output).toContain('alt="Claude"');
  });

  it("résout les images cid avec les pièces jointes fournies", () => {
    const input = '<img src="cid:claude-logo.png" alt="Logo">';
    const attachments = [{ filename: "claude-logo.png", size: 1024, mime_type: "image/png", content: "iVBORw0KGgo=" }];
    const output = sanitizeEmailHtml(input, attachments);
    expect(output).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });

  it("garde les balises style dans le head", () => {
    const input = '<html><head><style>.content { font-size: 14px; }</style></head><body><div class="content">Hello</div></body></html>';
    const output = sanitizeEmailHtml(input);
    expect(output).toContain("<style");
    expect(output).toContain("font-size: 14px;");
    expect(output).toContain("Hello");
  });
});

describe("isSafeUrl", () => {
  it("valide les URL http, https, mailto et tel", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com/page")).toBe(true);
    expect(isSafeUrl("//cdn.example.com/image.png")).toBe(true);
    expect(isSafeUrl("mailto:support@ethone.dev")).toBe(true);
    expect(isSafeUrl("tel:+33123456789")).toBe(true);
    expect(isSafeUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSafeUrl("cid:logo-image")).toBe(true);
  });

  it("rejette les URL dangereuses", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
  });
});

describe("MailBodyViewer Component", () => {
  const mockMessage: MailMessage = {
    id: "m-1",
    thread_id: "t-1",
    user_id: "u-1",
    folder: "inbox",
    direction: "inbound",
    from_address: "startups@anthropic.com",
    from_name: "Claude Startups",
    to_addresses: ["ruben@ethone.dev"],
    subject: "Update: We couldn't approve your Claude Startups application",
    body_html: '<table width="600"><tr><td><img src="https://anthropic.com/claude.png" width="140" alt="Claude"><h1>Votre candidature</h1></td></tr></table>',
    body_text: "Votre candidature à Claude Startups\n\n> Nous n'avons pas pu valider la demande.",
    is_read: true,
    is_starred: false,
    is_important: false,
    labels: [],
    attachments: [],
    received_at: "2026-10-09T18:00:00Z",
  };

  it("affiche l'iframe sandboxé pour un message HTML", async () => {
    await act(async () => {
      render(<MailBodyViewer msg={mockMessage} />);
    });
    const iframe = screen.getByTitle("Message m-1");
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute("sandbox")).toBe("allow-popups allow-popups-to-escape-sandbox allow-same-origin");
    expect(screen.getByText("Rendu isolé & assaini")).toBeTruthy();
  });

  it("permet de basculer en mode texte brut", async () => {
    await act(async () => {
      render(<MailBodyViewer msg={mockMessage} />);
    });
    const toggleButton = screen.getByText("Texte brut");
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(screen.getByText("Rendu HTML")).toBeTruthy();
    expect(screen.getByText("Votre candidature à Claude Startups")).toBeTruthy();
  });

  it("permet d'alterner entre le fond clair et le mode sombre", async () => {
    await act(async () => {
      render(<MailBodyViewer msg={mockMessage} />);
    });
    const themeButton = screen.getByTitle("Basculer en mode sombre");
    await act(async () => {
      fireEvent.click(themeButton);
    });
    expect(screen.getByText("Mode sombre")).toBeTruthy();
  });

  it("affiche directement la vue texte quand aucun HTML n'est fourni", async () => {
    const textOnlyMessage: MailMessage = {
      ...mockMessage,
      body_html: undefined,
      body_text: "Bonjour, ceci est un email au format texte seul.",
    };
    await act(async () => {
      render(<MailBodyViewer msg={textOnlyMessage} />);
    });
    expect(screen.getByText("Bonjour, ceci est un email au format texte seul.")).toBeTruthy();
    expect(screen.queryByTitle("Message m-1")).toBeNull();
  });
});
