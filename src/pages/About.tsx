import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Cpu, Database, Users, AlertCircle } from "lucide-react";
import { Heading } from "../components/UI";

export function About() {
  return (
    <div className="about-page">
      <Heading
        eyebrow="SYSTEM OVERVIEW"
        title="About & limitations"
        description="A factual reference on how Relay operates, what is AI-assisted versus rule-based, supported data sources, and current scope boundaries."
        action={
          <Link className="button" to="/">
            <ArrowLeft size={16} /> Back to workspace
          </Link>
        }
      />

      <section className="panel mb-6">
        <div className="flex gap-3 items-start">
          <ShieldCheck size={24} className="text-emerald-700 shrink-0 mt-1" />
          <div>
            <h2 className="text-base font-semibold">Fictional sample records</h2>
            <p className="text-sm text-neutral-600 mt-1">
              The records in the sample workspace are fictional and designed to demonstrate evidence linking, contradiction detection, lead review, and recipient handover continuity.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section className="panel">
          <div className="flex gap-2 items-center mb-3">
            <Cpu size={20} className="text-neutral-700" />
            <h2 className="text-base font-semibold">AI-Assisted vs. Rule-Based Systems</h2>
          </div>
          <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-neutral-900">1. Knowledge Extraction</h3>
              <p>
                <strong>AI-Assisted:</strong> When configured with a valid <code>LLM_API_KEY</code> and <code>LLM_PROVIDER=gemini</code>, Relay calls the official Google Gemini API (model <code>gemini-2.5-flash</code>) using structured JSON schema output to identify candidates across Ownership, Decisions, Blockers, and Risks.
              </p>
              <p className="mt-1">
                <strong>Verbatim Verification:</strong> Every excerpt returned by the model is checked server-side to ensure it appears verbatim in the source record. Any excerpt that fails verbatim verification is immediately rejected.
              </p>
              <p className="mt-1">
                <strong>Rule-Based Fallback:</strong> If the model call fails, times out, or the API key is not configured, the extraction pipeline falls back deterministically to regular-expression and structural sentence rules. Each claim is labeled honestly with its extractor: <em>AI-assisted</em> or <em>Rule-based</em>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900">2. Evidence Labeling &amp; Corroboration</h3>
              <p>
                All evidence synthesis is <strong>rule-based and deterministic</strong>. Claims supported by two or more independent records from the last six weeks receive the <em>Supported</em> badge. Competing owner assignments or opposing state transitions are deterministically flagged as <em>Conflicting</em>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900">3. Ask Relay (Interactive Q&amp;A)</h3>
              <p>
                The Ask Relay assistant runs strictly server-side. For incoming members, lead-only and unapproved records are excluded at the database query layer prior to retrieval. The model only receives permitted evidence and must return structured citations verifying every claim and source used.
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="flex gap-2 items-center mb-3">
            <Database size={20} className="text-neutral-700" />
            <h2 className="text-base font-semibold">Supported Sources</h2>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-neutral-700">
            <li><strong>Meeting Notes:</strong> Pasted or uploaded Markdown and plain-text meeting notes with title and visibility controls (capped at 8,000 characters).</li>
            <li><strong>GitHub Repository Issues:</strong> Live public GitHub repository issue import via unauthenticated REST API with snapshot permissions, plus structured JSON paste fallback.</li>
            <li><strong>Clarification Answers:</strong> Structured answers submitted by the departing member linked directly to candidate claims.</li>
            <li><strong>Repository History:</strong> Commit and pull request metadata capturing decisions, bug fixes, and author assignments.</li>
            <li><strong>Task Boards:</strong> Sprint board ownership items and scheduled background jobs.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="flex gap-2 items-center mb-3">
            <Users size={20} className="text-neutral-700" />
            <h2 className="text-base font-semibold">Role Model &amp; Permissions</h2>
          </div>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>
              <strong>Admin / Team Lead / Reviewer:</strong> Has administrative control over the organization and project. Can create projects via the wizard, invite team members, import sources (team-wide or lead-only), trigger reconstruction, review claims, submit clarification questions to departing members, approve immutable handover versions, and manage or revoke incoming member access.
            </p>
            <p>
              <strong>Departing Member:</strong> Receives clarification questions regarding gaps or conflicting evidence, submits authoritative answers that link as evidence, and views assigned ownership items.
            </p>
            <p>
              <strong>Incoming Member:</strong> Authenticates via secure invite token or revocable link/code. Access is strictly scoped to approved, audience-permitted claims and team-visible evidence. Lead-only records, rejected claims, and pending candidates return HTTP 403/404. Can view continuation tasks, record personal task notes, inspect version diffs, and formally acknowledge or re-acknowledge receipt.
            </p>
          </div>
        </section>

        <section className="panel border-amber-200 bg-amber-50/30">
          <div className="flex gap-2 items-center mb-3 text-amber-900">
            <AlertCircle size={20} />
            <h2 className="text-base font-semibold">Current Scope &amp; Stated Limitations</h2>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-amber-950">
            <li><strong>Email Verification &amp; Password Reset:</strong> Self-service email verification and email-based password reset are not built. Password resets must be performed by an organization admin.</li>
            <li><strong>Private Repository Connectors:</strong> Real-time private repository sync and webhooks (such as Jira or private GitHub with OAuth) are not built. GitHub connector imports public repository issues or structured JSON payloads.</li>
            <li><strong>Input Caps &amp; Rate Limits:</strong> Text imports are capped at 8,000 characters per note, and reconstruction and chat queries are rate-limited per workspace and IP address.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
