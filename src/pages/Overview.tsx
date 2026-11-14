import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Database,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
} from "lucide-react";
import { useStore } from "../state/Store";
import { activeGaps, latest, visibleClaims, plan } from "../domain/engine";

import { Badge, Heading } from "../components/UI";
export function Overview() {
  const { state, p } = useStore();
  const project = p;
  const incoming = state.role === "incoming";
  const claims = visibleClaims(p, state.role);
  const version = latest(p);
  const tasks = plan(version);
  const completed = tasks.filter((t) => p.tasks[t.id]?.done).length;
  const reviewed = p.claims.filter((c) => c.review !== "Pending Review").length;
  const stats = incoming
    ? [
        ["Approved claims", claims.length, "In your handover"],
        ["Week-one tasks", tasks.length, "Derived from approved facts"],
        ["Completed", completed, "Your onboarding progress"],
        [
          "Handover version",
          version ? `v${version.id}` : "—",
          "Latest approved snapshot",
        ],
      ]
    : [
        ["Connected sources", p.connections.length, "of 4 available sources"],
        [
          "Candidate claims",
          claims.length,
          "Evidence-linked project knowledge",
        ],
        [
          "Open knowledge gaps",
          activeGaps(p).filter((g) => !p.resolvedGaps.includes(g.id)).length,
          "Need a human perspective",
        ],
        [
          "Pending reviews",
          p.claims.length - reviewed,
          "Before the handover is shared",
        ],
      ];
  return (
    <>
      <Heading
        eyebrow="YOUR PROJECT, IN CONTEXT"
        title={
          incoming
            ? "Your next chapter starts here."
            : "Keep the context. Move forward."
        }
        description={
          incoming
            ? "A reviewed handover, with the evidence and next steps you need."
            : "Turn scattered project history into a handover your team can trust."
        }
        action={
          <Link
            className="button primary"
            to={incoming ? "/handover" : "/sources"}
          >
            {incoming
              ? "Open handover"
              : p.run
                ? "Continue handover"
                : "Start Knowledge Handover"}
            <ArrowUpRight size={17} />
          </Link>
        }
      />
      <section className="project-hero">
        <div className="hero-main">
          <div className="flex gap-2 items-center">
            <span className="project-mark">{project.code}</span>
            <Badge>Active sprint</Badge>
            <span className="hero-kicker">PROJECT CONTEXT</span>
          </div>
          <h2>{project.name}</h2>
          <p>
            {project.description}. A team member is leaving mid-sprint. <br />
            The work continues. The knowledge should, too.
          </p>
          <div className="people">
            <span className="avatar peach">{p.departing[0]}</span>
            <div>
              <small>Departing member</small>
              <strong>
                {p.departing}{" "}
                <span>
                  · {p.people.find(person => person.name === p.departing)?.role}
                </span>
              </strong>
            </div>
            <ArrowRight size={20} />
            <span className="avatar mint">{p.incoming[0]}</span>
            <div>
              <small>Incoming member</small>
              <strong>
                {p.incoming} <span>· {p.people.find(person => person.name === p.incoming)?.role}</span>
              </strong>
            </div>
          </div>
        </div>
        <div className="hero-status">
          <div className="orbit">
            <GitBranch size={34} />
          </div>
          <span className="eyebrow">HANDOVER STATUS</span>
          <h3>
            {version
              ? "Ready to carry forward"
              : p.run
                ? "Review in progress"
                : p.connections.length
                  ? "Sources connected"
                  : "Ready when you are"}
          </h3>
          <p>
            {version
              ? `Version ${version.id} approved by ${version.author}`
              : p.run
                ? `${reviewed} of ${p.claims.length} claims reviewed`
                : "Start by importing a meeting note."}
          </p>
        </div>
      </section>
      <div className="stats">
        {stats.map(([label, value, hint], i) => (
          <Link
            to={
              incoming
                ? "/handover"
                : ["/sources", "/knowledge", "/gaps", "/review"][i]
            }
            className="stat"
            key={label}
          >
            <div className="row">
              <span>{label}</span>
              {i === 0 ? (
                <Database size={17} />
              ) : i === 1 ? (
                <GitBranch size={17} />
              ) : i === 2 ? (
                <AlertTriangle size={17} />
              ) : (
                <ShieldCheck size={17} />
              )}
            </div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </Link>
        ))}
      </div>
      {claims.length > 0 && (
        <div
          className="flex flex-wrap gap-3 mb-6"
          aria-label="Project attention summary"
        >
          <Link
            to={incoming ? "/handover" : "/knowledge"}
            className="text-link"
          >
            <AlertTriangle size={15} />
            {
              claims.filter(
                (c) => c.category === "Blockers" && c.review !== "Rejected",
              ).length
            }{" "}
            blockers requiring follow-up
          </Link>
          <Link
            to={incoming ? "/handover" : "/knowledge"}
            className="text-link"
          >
            <GitBranch size={15} />
            {
              claims.filter(
                (c) => c.category === "Dependencies" && c.review !== "Rejected",
              ).length
            }{" "}
            dependencies to confirm
          </Link>
        </div>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>A clear path to continuity</h2>
            <p>Five stages. Evidence at every step.</p>
          </div>
          <Badge>
            {version ? "Approved" : p.run ? "Reviewing" : "Not yet shared"}
          </Badge>
        </div>
        <div className="workflow">
          {[
            [
              "Connect",
              "Import your sources",
              "/sources",
              p.connections.length > 0,
            ],
            [
              "Reconstruct",
              "Find the project context",
              "/reconstruct",
              p.run > 0,
            ],
            ["Verify", "Inspect the evidence", "/evidence", reviewed > 0],
            ["Review", "Keep humans in control", "/review", !!version],
            [
              "Handover",
              "Give the next person a start",
              "/handover",
              !!version?.acknowledged,
            ],
          ].map(([title, sub, to, done], i) => (
            <Link
              className={done ? "step done" : "step"}
              key={String(title)}
              to={incoming ? "/handover" : String(to)}
            >
              <span className="step-number">
                {done ? <Check size={16} /> : String(i + 1).padStart(2, "0")}
              </span>
              <strong>{title}</strong>
              <small>{sub}</small>
            </Link>
          ))}
        </div>
      </section>
      <div className="two-col">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>{incoming ? "Your first week" : "Activity, with a trail"}</h2>
              <p>
                {incoming
                  ? "Small steps, grounded in project context."
                  : "Every meaningful change stays inspectable."}
              </p>
            </div>
            <Link className="text-link" to={incoming ? "/plan" : "/history"}>
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {incoming ? (
            <>
              <h3>
                {completed} / {tasks.length} tasks complete
              </h3>
              <progress value={completed} max={tasks.length || 1} />
              <Link className="activity" to="/plan">
                Open your continuation plan <ArrowRight size={17} />
              </Link>
            </>
          ) : p.events.length ? (
            p.events.slice(0, 3).map((e) => (
              <Link
                key={e.id}
                className="activity"
                to={e.claimId ? `/evidence/${e.claimId}` : "/history"}
              >
                <span className="activity-icon">
                  <Clock3 size={16} />
                </span>
                <div>
                  <strong>{e.type}</strong>
                  <p>{e.detail}</p>
                </div>
                <ArrowUpRight size={14} />
              </Link>
            ))
          ) : (
            <>
              <Link className="activity" to="/projects">
                <span className="activity-icon">
                  <GitBranch size={16} />
                </span>
                <div>
                  <strong>A transition is on the horizon</strong>
                  <p>{p.departing}’s work needs a confirmed next owner.</p>
                </div>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="activity" to="/sources">
                <span className="activity-icon">
                  <Database size={16} />
                </span>
                <div>
                  <strong>Explore project sources</strong>
                  <p>Start with repository and meeting notes.</p>
                </div>
                <ArrowUpRight size={14} />
              </Link>
            </>
          )}
        </section>
        <section className="principle-card">
          <span className="eyebrow">THE RELAY DIFFERENCE</span>
          <h2>
            A handover you can
            <br />
            ask “why?” about.
          </h2>
          <p>
            Follow a claim to its source. See what’s uncertain. Let a person
            decide what carries forward.
          </p>
          <div>
            <ShieldCheck size={18} />
            <span>Traceable. Human-reviewed. Role-aware.</span>
          </div>
        </section>
      </div>
    </>
  );
}
export function Projects() {
  const { state, p, projectsList, switchProject, openWizard, org } = useStore();
  const displayList = projectsList.length > 0 ? projectsList : [
    {
      id: state.projectId,
      name: p.name,
      code: p.code,
      description: p.description,
      workspaceId: state.projectId,
      departing: p.departing,
      incoming: p.incoming,
      role: state.role,
      createdAt: "",
    }
  ];

  return (
    <>
      <Heading
        eyebrow="WORKSPACE"
        title="Projects & people"
        description="Active handover projects and team members across your organisation."
        action={
          <button className="button primary" onClick={openWizard}>
            + New project
          </button>
        }
      />
      <div className="two-col">
        {displayList.map((pr) => (
          <section className="panel" key={pr.id}>
            <div className="flex justify-between items-start mb-2">
              <span className="project-mark">{pr.code}</span>
              {pr.id === state.projectId ? (
                <Badge>Active project</Badge>
              ) : (
                <button
                  className="button secondary text-xs py-1"
                  onClick={() => switchProject && switchProject(pr.workspaceId)}
                >
                  Open project
                </button>
              )}
            </div>
            <h2>{pr.name}</h2>
            <p>{pr.description}</p>
            <div className="people mt-3 p-2 bg-stone-50 rounded text-xs flex justify-between items-center">
              <div>
                <small className="text-stone-500 block">Transition:</small>
                <strong>{pr.departing} → {pr.incoming}</strong>
              </div>
              <small className="text-stone-400 font-medium">{pr.role || "Lead"}</small>
            </div>
          </section>
        ))}
      </div>
      <section className="panel mt-6">
        <h2>The handover team</h2>
        <div className="team-grid">
          {p.people.map(({name, role}) => (
            <div className="team-member" key={name}>
              <span className="avatar mint">{name[0]}</span>
              <strong>{name}</strong>
              <small>{role}</small>
            </div>
          ))}
        </div>
        {p.sample && (
          <p className="hint">
            The sample team and initial records are fictional.
          </p>
        )}
      </section>
    </>
  );
}
