import { renderHook, waitFor, act } from "@testing-library/react";
import { useMail } from "./useMail";
import { fetchWorker } from "../api";

jest.mock("../api");

const mockedFetchWorker = fetchWorker as jest.MockedFunction<typeof fetchWorker>;

describe("useMail", () => {
  beforeEach(() => {
    mockedFetchWorker.mockReset();
  });

  it("loads inbox messages and unread count", async () => {
    mockedFetchWorker.mockImplementation(async (path) => {
      if (String(path).startsWith("/api/mail/inbox")) {
        return {
          data: [
            { id: "1", thread_id: "t1", folder: "inbox", from_address: "a@b.com", subject: "Hello", is_read: false, is_starred: false, is_important: false, labels: [], attachments: [], received_at: "2026-08-20T10:00:00Z" },
          ],
          meta: { unread: 1 },
        };
      }
      return { data: [] };
    });

    const { result } = renderHook(() => useMail());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.unread).toBe(1);
  });

  it("sends a mail and reloads the inbox", async () => {
    mockedFetchWorker.mockImplementation(async (path) => {
      if (String(path) === "/api/mail/send") return { data: { sent: true } };
      if (String(path).startsWith("/api/mail/inbox")) return { data: [], meta: { unread: 0 } };
      return { data: [] };
    });

    const { result } = renderHook(() => useMail());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendMail({
        to: ["to@example.com"],
        subject: "Test",
        text: "Body",
      });
    });

    const calls = mockedFetchWorker.mock.calls.map((c) => String(c[0]));
    expect(calls).toContain("/api/mail/send");
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/mail/send",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("creates a label and reloads the list", async () => {
    mockedFetchWorker.mockImplementation(async (path) => {
      if (String(path) === "/api/mail/labels") return { data: [{ id: "l1", name: "work" }] };
      if (String(path).startsWith("/api/mail/inbox")) return { data: [], meta: { unread: 0 } };
      return { data: [] };
    });

    const { result } = renderHook(() => useMail());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createLabel("work");
    });

    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/mail/labels",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "work" }),
      })
    );
    expect(result.current.labels).toEqual([{ id: "l1", name: "work" }]);
  });

  it("calls mail endpoint helpers correctly", async () => {
    mockedFetchWorker.mockImplementation(async (path) => {
      if (String(path).startsWith("/api/mail/inbox")) return { data: [], meta: { unread: 0 } };
      if (String(path).startsWith("/api/mail/contacts")) return { data: [{ email: "a@b.com", name: "Alice" }] };
      if (String(path) === "/api/mail/extract") return { data: { entities: [{ type: "person", value: "Alice" }] } };
      if (String(path).startsWith("/api/mail/notifications") && !String(path).includes("unread=true")) return { data: [{ id: "n1", message: "hello" }] };
      return { data: null };
    });

    const { result } = renderHook(() => useMail());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const contacts = await act(async () => result.current.getContacts(10));
    expect(contacts).toEqual([{ email: "a@b.com", name: "Alice" }]);
    expect(mockedFetchWorker).toHaveBeenCalledWith("/api/mail/contacts?limit=10");

    const extracted = await act(async () => result.current.extractEntities("msg-1"));
    expect(extracted).toEqual({ entities: [{ type: "person", value: "Alice" }] });
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/mail/extract",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: "msg-1" }),
      })
    );

    const notifications = await act(async () => result.current.getNotifications({ limit: 5, unreadOnly: false }));
    expect(notifications).toEqual([{ id: "n1", message: "hello" }]);
    expect(mockedFetchWorker).toHaveBeenCalledWith("/api/mail/notifications?limit=5&unread=false");

    await act(async () => result.current.markNotificationRead("n1", true));
    expect(mockedFetchWorker).toHaveBeenCalledWith(
      "/api/mail/notifications",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: "n1", is_read: true }),
      })
    );
  });

  it("handles fetch errors gracefully", async () => {
    mockedFetchWorker.mockRejectedValue(new Error("Network down"));

    const { result } = renderHook(() => useMail());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("Network down");
  });
});
