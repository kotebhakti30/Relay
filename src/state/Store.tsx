import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  State,
  UserAccount,
  Organisation,
  ProjectSummary,
  ClarificationQuestion,
  VersionDiff,
} from "../domain/types";
import type { Action } from "../domain/engine";
import { AuthModal } from "../components/AuthModal";
import { ProjectWizard } from "../components/ProjectWizard";
import { Sparkles, Building2, LogIn, ArrowRight } from "lucide-react";

export async function api(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
) {
  const res = await fetch("/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? "Bearer " + token : "",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({
    error: "API unavailable. Check the deployment and retry.",
  }));
  if (!res.ok || data?.error) {
    const err = new Error(data?.error || "Request failed.");
    (err as any).status = res.status;
    throw err;
  }
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

interface StoreContextType {
  state: State;
  dispatch: (a: Command) => Promise<boolean>;
  busy: boolean;
  incomingLink: string;
  ask: (question: string) => Promise<any>;
  user: UserAccount | null;
  org: Organisation | null;
  orgs: Organisation[];
  projectsList: ProjectSummary[];
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass: string, org: string) => Promise<boolean>;
  demoLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  createProject: (data: any) => Promise<boolean>;
  switchProject: (workspaceId: string) => Promise<void>;
  importGithub: (repo: string, visibility: string, issuesJson?: any) => Promise<any>;
  askQuestion: (claimId: string, question: string, assignedTo?: string, dueDate?: string, gapId?: string) => Promise<any>;
  answerClarification: (questionId: string, answer: string) => Promise<any>;
  fetchQuestions: (claimId?: string) => Promise<ClarificationQuestion[]>;
  fetchDiff: (v1?: number, v2?: number) => Promise<VersionDiff>;
  fetchStale: () => Promise<any[]>;
  fetchOrgDetails: (orgId: string) => Promise<any>;
  updateOrgName: (orgId: string, name: string) => Promise<any>;
  inviteMember: (role: string) => Promise<any>;
  openAuthModal: (mode?: "login" | "signup") => void;
  openWizard: () => void;
}

const Context = createContext<StoreContextType | null>(null);

export function Store({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(session),
    [state, setState] = useState<State | null>(null),
    [user, setUser] = useState<UserAccount | null>(null),
    [org, setOrg] = useState<Organisation | null>(null),
    [orgs, setOrgs] = useState<Organisation[]>([]),
    [projectsList, setProjectsList] = useState<ProjectSummary[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [authModal, setAuthModal] = useState<{ open: boolean; mode: "login" | "signup" }>({
      open: false,
      mode: "login",
    }),
    [wizardOpen, setWizardOpen] = useState(false);

  const share = state?.projects[state.projectId]?.sharing;
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
    if (!token) return;
    try {
      const s = await api("state", token);
      setState(s);
      await syncUser();
    } catch (e: any) {
      if (e.status === 401 || e.status === 404) {
        sessionStorage.removeItem(key);
        setToken("");
        setState(null);
        setError("");
      } else {
        throw e;
      }
    }
  }

  async function syncUser() {
    if (!token) return;
    try {
      const me = await api("auth/me", token);
      if (me?.authenticated) {
        setUser(me.user);
        setOrgs(me.orgs || []);
        setOrg(me.currentOrg || null);
        if (me.currentOrg?.id) {
          const projs = await api(`projects?orgId=${me.currentOrg.id}`, token);
          setProjectsList(projs || []);
        }
      }
    } catch {}
  }

  useEffect(() => {
    let active = true;
    let inFlight = false;

    async function sync() {
      if (!token || inFlight) return;
      inFlight = true;
      try {
        const next = await api("state", token);
        if (active) {
          setState(next);
          setError("");
          void syncUser();
        }
      } catch (e: any) {
        if (active) {
          if (e.status === 401 || e.status === 404) {
            // Treat 401 and 404 on state call as "signed out" cleanly.
            // Clear stale session token, show no error banner, and do not retry.
            sessionStorage.removeItem(key);
            setToken("");
            setState(null);
            setError("");
          } else if (state) {
            // Real network failure or 5xx on an already active session
            setError(e.message || "Connection lost. Please retry.");
          }
        }
      } finally {
        inFlight = false;
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

  async function handleLogin(email: string, pass: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api("auth/login", "", "POST", { email, password: pass });
      if (res?.token) {
        remember(res.token);
        setUser(res.user);
        setOrgs(res.orgs || []);
        setOrg(res.currentOrg || null);
        return true;
      }
      return false;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(name: string, email: string, pass: string, orgName: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api("auth/signup", "", "POST", { name, email, password: pass, orgName });
      if (res?.token) {
        remember(res.token);
        setUser(res.user);
        setOrg(res.org);
        setOrgs([res.org]);
        setWizardOpen(true); // Open project setup wizard immediately upon signup
        return true;
      }
      return false;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoLogin() {
    setBusy(true);
    setError("");
    try {
      const res = await api("auth/demo-login", "", "POST", {});
      if (res?.token) {
        remember(res.token);
        setUser(res.user);
        setOrg(res.org);
        setOrgs([res.org]);
        return true;
      }
      return false;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api("auth/logout", token, "POST", {});
    } catch {}
    sessionStorage.removeItem(key);
    setToken("");
    setState(null);
    setUser(null);
    setOrg(null);
    setOrgs([]);
    setError("");
  }

  async function handleCreateProject(data: any) {
    setBusy(true);
    setError("");
    try {
      const res = await api("projects", token, "POST", { ...data, orgId: org?.id });
      if (res?.token) {
        remember(res.token);
        await refresh();
        return true;
      }
      return false;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchProject(workspaceId: string) {
    // Re-issue workspace session for requested project
    remember(workspaceId);
    await refresh();
  }

  async function handleImportGithub(repo: string, visibility: string, issuesJson?: any) {
    setBusy(true);
    try {
      const res = await api("sources/github", token, "POST", { repo, visibility, issuesJson });
      await refresh();
      return res;
    } finally {
      setBusy(false);
    }
  }

  async function handleAskQuestion(claimId: string, question: string, assignedTo?: string, dueDate?: string, gapId?: string) {
    return await api("questions", token, "POST", { claimId, question, assignedTo, dueDate, gapId });
  }

  async function handleAnswerClarification(questionId: string, answer: string) {
    const res = await api(`questions/${questionId}/answers`, token, "POST", { answer });
    await refresh();
    return res;
  }

  async function handleFetchQuestions(claimId?: string) {
    const qParam = claimId ? `?claimId=${encodeURIComponent(claimId)}` : "";
    return await api(`questions${qParam}`, token);
  }

  async function handleFetchDiff(v1?: number, v2?: number) {
    const params = new URLSearchParams();
    if (v1) params.set("v1", String(v1));
    if (v2) params.set("v2", String(v2));
    return await api(`versions/diff?${params.toString()}`, token);
  }

  async function handleFetchStale() {
    return await api("versions/stale", token);
  }

  async function handleFetchOrgDetails(orgId: string) {
    return await api(`orgs/${orgId}`, token);
  }

  async function handleUpdateOrgName(orgId: string, name: string) {
    const res = await api(`orgs/${orgId}`, token, "PATCH", { name });
    await syncUser();
    return res;
  }

  async function handleInviteMember(role: string) {
    const currentProjId = state?.projectId;
    return await api(`projects/${currentProjId}/invites`, token, "POST", { role, expiresInHours: 48 });
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
            audience: a.audience ? state?.projects[state.projectId].incoming : "",
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
            version: state?.projects[state.projectId].versions.at(-1)?.id,
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

  async function ask(question: string) {
    if (!token) throw new Error("Not authenticated");
    return await api("ask", token, "POST", { question });
  }

  const feedback = error && (
    <aside className="storage-warning" role="alert">
      {error}{" "}
      <button
        onClick={() => {
          setError("");
          if (token) refresh().catch((e) => setError(e.message));
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
            <span className="eyebrow">Relay</span>
            <h1>Knowledge handover for teams</h1>
            <p>
              Turn project notes into a handover. Trace each claim to its source, review open questions and share an approved first-week plan.
            </p>

            {/* Evaluator Demo Callout Card */}
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-left max-w-md">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <Sparkles size={14} /> Public Demo Account
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono">
                  Team Lead Pre-loaded
                </span>
              </div>
              <p className="text-xs text-emerald-800 mb-2">
                Evaluate full lead capabilities with seeded project records:
                <br />
                <strong>demo@relay.local</strong> / <strong>DemoUser2026!</strong>
              </p>
              <div className="flex gap-2">
                <button
                  className="button primary text-xs py-1.5 flex-1 flex justify-center items-center gap-1"
                  disabled={busy}
                  onClick={handleDemoLogin}
                >
                  Sign in as Demo Lead <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className="button secondary text-xs font-medium flex items-center gap-1"
                onClick={() => setAuthModal({ open: true, mode: "signup" })}
              >
                <Building2 size={14} /> Create your organisation
              </button>
              <button
                className="button secondary text-xs font-medium flex items-center gap-1"
                onClick={() => setAuthModal({ open: true, mode: "login" })}
              >
                <LogIn size={14} /> Sign in
              </button>
            </div>

            <button
              className="primary"
              disabled={busy || (!!token && !error)}
              onClick={start}
            >
              {busy
                ? "Starting…"
                : token && !error
                  ? "Opening workspace…"
                  : "Explore sample workspace"}
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void exchange({ code });
              }}
            >
              <label>
                Handover access code
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

        <AuthModal
          isOpen={authModal.open}
          onClose={() => setAuthModal({ open: false, mode: "login" })}
          onLogin={handleLogin}
          onSignup={handleSignup}
          onDemoLogin={handleDemoLogin}
          initialMode={authModal.mode}
          busy={busy}
        />
      </main>
    );

  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        busy,
        incomingLink,
        ask,
        user,
        org,
        orgs,
        projectsList,
        login: handleLogin,
        signup: handleSignup,
        demoLogin: handleDemoLogin,
        logout: handleLogout,
        createProject: handleCreateProject,
        switchProject: handleSwitchProject,
        importGithub: handleImportGithub,
        askQuestion: handleAskQuestion,
        answerClarification: handleAnswerClarification,
        fetchQuestions: handleFetchQuestions,
        fetchDiff: handleFetchDiff,
        fetchStale: handleFetchStale,
        fetchOrgDetails: handleFetchOrgDetails,
        updateOrgName: handleUpdateOrgName,
        inviteMember: handleInviteMember,
        openAuthModal: (mode = "login") => setAuthModal({ open: true, mode }),
        openWizard: () => setWizardOpen(true),
      }}
    >
      {feedback}
      {busy && (
        <div className="saving" role="status">
          Saving…
        </div>
      )}
      {children}

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, mode: "login" })}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onDemoLogin={handleDemoLogin}
        initialMode={authModal.mode}
        busy={busy}
      />

      <ProjectWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreateProject}
        busy={busy}
      />
    </Context.Provider>
  );
}

export function useStore() {
  const c = useContext(Context);
  if (!c) throw Error("Store missing");
  const p = c.state.projects[c.state.projectId] || Object.values(c.state.projects)[0];
  return { ...c, p };
}
