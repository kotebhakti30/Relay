import { useEffect, useRef, useId, type ReactNode } from "react";
import { X, ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { Claim, SourceRecord } from "../domain/types";

/**
 * Strips stray markdown characters (**, #, leading list bullets) from statements when rendering
 */
export function cleanText(s: string): string {
  if (!s || typeof s !== "string") return "";
  return s
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\s*[-*•]\s+/g, "")
    .trim();
}

/**
 * Replaces "Unassigned" with "Owner not identified" when no owner is present
 */
export function cleanOwner(owner?: string): string {
  if (!owner || owner === "Unassigned" || owner.toLowerCase() === "unassigned") {
    return "Owner not identified";
  }
  return owner;
}
export function Badge({ children }: { children: ReactNode }) {
  const text = String(children);
  return (
    <span
      className={`badge ${/Conflicting|Unresolved|High/.test(text) ? "amber" : /Insufficient|Rejected/.test(text) ? "red" : /Supported|Accepted|Connected|Approved|Resolved/.test(text) ? "green" : ""}`}
    >
      {children}
    </span>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "A little context goes a long way.",
  description = "Connect data sources and reconstruct the project to get started.",
  to = "/sources",
  action = "Connect sources",
}: {
  title?: string;
  description?: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText size={26} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button primary" to={to}>
        {action}
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Evidence({
  claim,
  records,
}: {
  claim: Claim;
  records: SourceRecord[];
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge>{claim.category}</Badge>
        <Badge>{claim.evidence}</Badge>
        <Badge>
          {claim.refs.length} {claim.refs.length === 1 ? "source" : "sources"}
        </Badge>
        {(claim.resolution || claim.review === "Accepted") && (
          <Badge>Reviewer-confirmed</Badge>
        )}
        <Badge>Extractor · {claim.extractor}</Badge>
        <Badge>{claim.review}</Badge>
        {claim.restricted && <Badge>Lead only</Badge>}
      </div>
      <h2 className="claim-title">{cleanText(claim.statement)}</h2>
      <div className="meta">
        Owner: {cleanOwner(claim.owner)} · Last evidence: {date(claim.updated)}
      </div>
      <div className="explanation">
        <ShieldCheck size={19} />
        <div>
          <strong>Why this label?</strong>
          <p>{claim.explanation}</p>
          <small>
            Citations provide traceability, not a guarantee of truth.
          </small>
        </div>
      </div>
      {claim.labelHistory && (
        <details>
          <summary>Evidence label history</summary>
          {claim.labelHistory.map((h, i) => (
            <p key={i}>
              {date(h.at)} · {h.label} · {h.count}{" "}
              {h.count === 1 ? "source" : "sources"}
            </p>
          ))}
        </details>
      )}
      {claim.resolution && (
        <div className="note">
          <strong>Reviewer resolution</strong>
          <p>{claim.resolution}</p>
          <small>Original evidence label is retained for traceability.</small>
        </div>
      )}
      {claim.note && (
        <p>
          <strong>Review note:</strong> {claim.note}
        </p>
      )}
      <h3>
        Source evidence <span className="muted">({claim.refs.length})</span>
      </h3>
      <div className="source-excerpts">
        {claim.refs.map((id) => {
          const r = records.find((r) => r.id === id);
          return r ? (
            <Link className="excerpt" key={id} to={`/record/${id}`}>
              <div className="row">
                <strong>{r.title}</strong>
                <ArrowUpRight size={16} />
              </div>
              <p>“{claim.quotes?.[id] || r.content}”</p>
              <small>
                {r.id} · {r.author} · {date(r.timestamp)}
              </small>
            </Link>
          ) : (
            <p key={id} className="muted">
              Source unavailable in the current context. Reconstruct after
              changing sources.
            </p>
          );
        })}
      </div>
    </>
  );
}
export function date(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
