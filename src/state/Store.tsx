import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { State } from "../domain/types";
import type { Action } from "../domain/engine";
async function api(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
) {
  const res = await fetch("/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({
    error: "API unavailable. Check the deployment and retry.",
  }));
  if (!res.ok || data?.error) throw new Error(data?.error || "Request failed.");
  return data;
}
type Command =
  | Action
  | { type: "share"; action: "regenerate" | "revoke" }
  | { type: "import"; text: string; title: string; visibility: string };
const key = "relay-session-v2";
function session() {
  if (location.hash.startsWith("#share=")) return "";
  return sessionStorage.getItem(key) || "";
}
const Context = createContext<{
  state: State;
  dispatch: (a: Command) => Promise<boolean>;
  busy: boolean;
  incomingLink: string;
} | null>(null);
export function Store({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(session),
    [state, setState] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState("");
  const share = state?.projects.campus.sharing;
  const incomingLink = share
    ? location.origin + location.pathname + "#share=" + share.link
    : "";
  async function exchange(body: { link?: string; code?: string }) {
    setBusy(true);
    setError("");
    try {
      const r = await api("redeem", "", "POST", body);
      history.replaceState(null, "", location.pathname + "#/handover");
      remember(r.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const link = location.hash.match(/^#share=(.+)$/)?.[1];
    if (link) {
      sessionStorage.removeItem(key);
      void exchange({ link });
    }
  }, []);
  function remember(value: string) {
    sessionStorage.setItem(key, value);
    setToken(value);
  }
  async function refresh() {
    if (token) setState(await api("state", token));
  }
  useEffect(() => {
    let active = true;
    async function sync() {
      try {
        const next = await api("state", token);
        if (active) setState(next);
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setState(null);
        }
      }
    }
    if (token) {
      void sync();
      window.addEventListener("focus", sync);
    }
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
    };
  }, [token]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      remember((await api("workspaces", "", "POST", {})).token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function dispatch(a: Command) {
    setBusy(true);
    setError("");
    try {
      switch (a.type) {
        case "reset": {
          const r = await api("reset", token, "POST", {});
          setState(null);

          remember(r.token);
          break;
        }
        case "import":
          await api("sources", token, "POST", a);
          break;
        case "reconstruct":
          await api("reconstruct", token, "POST", {});
          break;
        case "review":
          await api("claims/" + a.id, token, "PATCH", a);
          break;
        case "approve":
          await api("versions", token, "POST", {
            audience: a.audience ? "Neha" : "",
            confirm: a.appropriate,
          });
          break;
        case "share":
          await api("invite", token, "POST", { action: a.action });
          break;
        case "task":
          await api("tasks/" + a.id, token, "POST", a);
          break;
        case "ack":
          await api("acknowledge", token, "POST", {
            version: state?.projects.campus.versions.at(-1)?.id,
          });
          break;
        default:
          throw Error("Unsupported action.");
      }
      if (a.type !== "reset") await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const feedback = error && (
    <aside className="storage-warning" role="alert">
      {error}{" "}
      <button
        onClick={() => {
          setError("");
          refresh().catch((e) => setError(e.message));
        }}
      >
        Retry connection
      </button>
    </aside>
  );
  if (!state)
    return (
      <main className="entry">
        <div className="project-hero">
          <div className="hero-main">
            <span className="eyebrow">DEV404 · RELAY</span>
            <h1>Keep the context. Move forward.</h1>
            <p>
              Aarav is leaving CampusConnect. Build a handover Neha can verify
              and act on.
            </p>
            <p>
              Synthetic sample workspace. Your notes stay in this workspace
              only.
            </p>
            <button
              className="primary"
              disabled={busy || (!!token && !error)}
              onClick={start}
            >
              {busy
                ? "Starting…"
                : token && !error
                  ? "Opening workspace…"
                  : "Try CampusConnect"}
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void exchange({ code });
              }}
            >
              <label>
                Neha’s access code
                <input
                  value={code}
                  maxLength={12}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button disabled={busy || code.trim().length !== 12}>
                Open shared handover
              </button>
            </form>
          </div>
        </div>
        {feedback}
      </main>
    );
  return (
    <Context.Provider value={{ state, dispatch, busy, incomingLink }}>
      {feedback}
      {busy && (
        <div className="saving" role="status">
          Saving…
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw Error("Store missing");
  return { ...c, p: c.state.projects.campus };
}
