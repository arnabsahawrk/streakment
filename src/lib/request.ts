/** One way for every screen to talk to the API. It never throws: a failed
 *  call comes back as `{ ok: false, error }` with a plain message to show.
 *  If the session has locked in the meantime (401) it goes to the lock screen. */
export type Reply<T> = { ok: true; data: T } | { ok: false; error: string };

export async function send<T>(
  url: string,
  method: "POST" | "PATCH",
  body?: unknown,
): Promise<Reply<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) {
      window.location.assign("/unlock");
      return { ok: false, error: "Locked." };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof data?.error === "string" ? data.error : "Didn't go through." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "No connection. Try again." };
  }
}
