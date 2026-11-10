import { useEffect, useState } from "react";
import {
  HashRouter,
  NavLink,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  LayoutDashboard,
  FolderKanban,
  Database,
  Workflow,
  ScanSearch,
  Radar,
  ClipboardCheck,
  Send,
  History,
  Route as RouteIcon,
  RotateCcw,
  Menu,
  X,
  ChevronRight,
  ArrowRight,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Store, useStore } from "./state/Store";
import { projects } from "./data/scenario";
import { latest } from "./domain/engine";
import { Overview, Projects } from "./pages/Overview";
import { Sources, Reconstruct } from "./pages/Sources";
import { Knowledge, RecordPage } from "./pages/Knowledge";
import { Review, Gaps } from "./pages/Review";
import { Handover, Plan } from "./pages/Handover";
import { History as HistoryPage } from "./pages/History";
import { Modal } from "./components/UI";
import type { Role } from "./domain/types";
const navigation = [
  ["/", "Overview", LayoutDashboard],
  ["/projects", "Projects", FolderKanban],
  ["/sources", "Data Sources", Database],
  ["/reconstruct", "Reconstruction", Workflow],
  ["/knowledge", "Project Knowledge", BookOpen],
  ["/evidence", "Evidence Explorer", ScanSearch],
  ["/gaps", "Knowledge Gap Radar", Radar],
  ["/review", "Review & Approval", ClipboardCheck],
  ["/handover", "Handover", Send],
  ["/plan", "First-week Plan", RouteIcon],
  ["/history", "Activity History", History],
] as const;
const incomingPaths = ["/", "/projects", "/handover", "/plan"];
const departingPaths = [
  "/",
  "/projects",
  "/knowledge",
  "/evidence",
  "/gaps",
  "/handover",
  "/plan",
];
function Guard({
  children,
  reviewer = false,
}: {
  children: React.ReactNode;
  reviewer?: boolean;
}) {
  const { state } = useStore();
  if ((reviewer && state.role !== "reviewer") || state.role === "incoming")
    return <Navigate to="/handover" replace />;
  return children;
}
function Shell() {
  const { state, p, dispatch, busy } = useStore();
  const loc = useLocation();
  const nav = useNavigate();
  const [reset, setReset] = useState(false);
  const [guide, setGuide] = useState(0);
  const [menu, setMenu] = useState(false);
  const [about, setAbout] = useState(false);
  const [toast, setToast] = useState("");
  const current = projects.find((pr) => pr.id === state.projectId)!;
  const event = p.events[0];
  useEffect(() => {
    if (!event) return;
    setToast(`${event.type}: ${event.detail}`);
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [event?.id, event?.at]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <NavLink to="/" className="brand">
          <span className="brand-symbol">
            r<span>↗</span>
          </span>
          <span>
            relay<span className="brand-dot">.</span>
          </span>
        </NavLink>
        <div className="workspace-label">DEV404 WORKSPACE</div>
        <div className="workspace-card">
          <span className="workspace-avatar">D4</span>
          <div>
            <strong>Project continuity</strong>
            <small>Round 2 · Knowledge handover</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation
            .filter(
              ([path]) =>
                state.role === "reviewer" ||
                (state.role === "incoming"
                  ? incomingPaths
                  : departingPaths
                ).includes(path),
            )
            .map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <Icon size={18} />
                <span>{label}</span>
                {path === "/review" &&
                  p.claims.some((c) => c.review === "Pending Review") && (
                    <span className="nav-count">
                      {
                        p.claims.filter((c) => c.review === "Pending Review")
                          .length
                      }
                    </span>
                  )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={20} />
            <h3>Knowledge carries forward.</h3>
            <p>
              Evidence first.
              <br />
              People in control.
            </p>
          </div>
          <button className="sidebar-about" onClick={() => setAbout(true)}>
            About Relay <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-user">
            <span className="avatar">
              {state.role === "reviewer"
                ? "R"
                : state.role === "incoming"
                  ? "N"
                  : p.departing[0]}
            </span>
            <div>
              <strong>
                {state.role === "reviewer"
                  ? "Riya"
                  : state.role === "incoming"
                    ? "Neha"
                    : p.departing}
              </strong>
              <small>
                {state.role === "reviewer"
                  ? "Team lead / reviewer"
                  : state.role === "incoming"
                    ? "Incoming developer"
                    : "Departing developer"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
          <label className="project-switch">
            <span className="tiny-project">{current.code}</span>
            <strong>{current.name}</strong>
          </label>
          <div className="topbar-right">
            <span className="demo-pill">
              <span /> CAMPUSCONNECT
            </span>
            <strong>
              {state.role === "reviewer"
                ? "Team lead · Riya"
                : "Viewing as Incoming Developer, Neha"}
            </strong>
            {state.role === "reviewer" && (
              <button className="reset-button" onClick={() => setReset(true)}>
                <RotateCcw size={15} />
                Reset workspace
              </button>
            )}
          </div>
        </header>
        <div className="context-bar">
          <span>
            Workspace <ChevronRight size={13} /> {current.name}{" "}
            <ChevronRight size={13} />{" "}
            <strong>
              {navigation.find(([path]) => path === loc.pathname)?.[1] ||
                "Evidence detail"}
            </strong>
          </span>
          <button onClick={() => setGuide(guide < 0 ? 0 : -1)}>
            How to try this
          </button>
        </div>
        <p className="notice workspace-banner">
          Synthetic sample workspace. Your notes stay in this workspace only.
        </p>
        {guide >= 0 && (
          <section className="panel">
            <h2>How to try this</h2>
            <ol>
              <li>Open Data Sources and import your own note.</li>
              <li>Run Reconstruction and inspect an exact quotation.</li>
              <li>Review the candidates, choose Neha and approve.</li>
              <li>
                Open Neha’s link in another browser, complete a task and
                acknowledge receipt.
              </li>
            </ol>
          </section>
        )}
        <main id="main" tabIndex={-1} key={`${state.projectId}-${state.role}`}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/projects" element={<Projects />} />
            <Route
              path="/sources"
              element={
                <Guard reviewer>
                  <Sources />
                </Guard>
              }
            />
            <Route
              path="/reconstruct"
              element={
                <Guard reviewer>
                  <Reconstruct />
                </Guard>
              }
            />
            <Route
              path="/knowledge"
              element={
                <Guard>
                  <Knowledge />
                </Guard>
              }
            />
            <Route
              path="/evidence"
              element={
                <Guard>
                  <Knowledge explorer />
                </Guard>
              }
            />
            <Route
              path="/evidence/:id"
              element={
                <Guard>
                  <Knowledge explorer />
                </Guard>
              }
            />
            <Route path="/record/:id" element={<RecordPage />} />
            <Route
              path="/gaps"
              element={
                <Guard>
                  <Gaps />
                </Guard>
              }
            />
            <Route
              path="/review"
              element={
                <Guard reviewer>
                  <Review />
                </Guard>
              }
            />
            <Route path="/handover" element={<Handover />} />
            <Route path="/plan" element={<Plan />} />
            <Route
              path="/history"
              element={
                <Guard reviewer>
                  <HistoryPage />
                </Guard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer>
          <span>Relay · DEV404</span>
          <span>Sample records and imported notes · Server-enforced roles</span>
        </footer>
      </div>
      {toast && state.role === "reviewer" && (
        <div role="status" className="toast">
          <CheckIcon />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {reset && (
        <Modal title="Reset the entire demo?" onClose={() => setReset(false)}>
          <p>
            This retires your workspace and its links, and starts a fresh
            CampusConnect workspace.
          </p>
          <div className="actions">
            <button onClick={() => setReset(false)}>Keep my progress</button>
            <button
              disabled={busy}
              className="danger"
              onClick={() => {
                dispatch({ type: "reset" });
                setReset(false);
                setGuide(-1);
                setToast("");
                nav("/");
              }}
            >
              Reset everything
            </button>
          </div>
        </Modal>
      )}
      {about && (
        <Modal title="About Relay" onClose={() => setAbout(false)}>
          <p>
            Relay uses signed anonymous access links and PostgreSQL. Synthetic
            records illustrate the handover. Notes are imported and processed on
            the server. Candidate labels identify the extractor. This demo uses
            simplified bearer-link access without OAuth.
          </p>
        </Modal>
      )}
    </div>
  );
}
function CheckIcon() {
  return <ShieldCheck size={19} />;
}
export default function App() {
  return (
    <Store>
      <HashRouter>
        <Shell />
      </HashRouter>
    </Store>
  );
}
