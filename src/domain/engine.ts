import { gaps } from "../data/scenario";
import type {
  Claim,
  ProjectState,
  SourceRecord,
  Role,
  PlanTask,
  HandoverVersion,
  ReviewState,
  SourceType,
} from "./types";
export function activeGaps(p: ProjectState) {
  return gaps.filter((g) =>
    p.claims.some(
      (c) =>
        c.id === g.claimId &&
        (g.id !== "gap-payment" || c.evidence !== "Supported"),
    ),
  );
}
export function latest(p: ProjectState) {
  return p.versions.at(-1);
}
export function readerClaims(v?: HandoverVersion) {
  return (
    v?.claims.filter(
      (c) =>
        !c.restricted &&
        c.review !== "Rejected" &&
        c.review !== "Pending Review" &&
        c.refs.every((id) =>
          v.records.some((r) => r.id === id && r.access === "team"),
        ),
    ) || []
  );
}
export function visibleClaims(p: ProjectState, role: Role) {
  return role === "incoming"
    ? readerClaims(latest(p))
    : p.claims.filter((c) => role === "reviewer" || !c.restricted);
}
export function visibleRecords(p: ProjectState, role: Role) {
  if (role === "incoming") {
    const v = latest(p);
    const ids = new Set(readerClaims(v).flatMap((c) => c.refs));
    return v?.records.filter((r) => r.access === "team" && ids.has(r.id)) || [];
  }
  return (p.records || []).filter(
    (r) => role === "reviewer" || r.access === "team",
  );
}
export function approvalErrors(p: ProjectState) {
  return [
    !p.claims.length ? "Reconstruct knowledge first." : "",
    p.dirty ? "Sources changed. Reconstruct before approval." : "",
    p.claims.some((c) => c.review === "Pending Review")
      ? "Review every candidate claim."
      : "",
    p.claims.some(
      (c) =>
        c.review === "Accepted" && c.evidence !== "Supported" && !c.resolution,
    )
      ? "Resolve evidence concerns or mark those claims unresolved."
      : "",
    !p.claims.some(
      (c) => !c.restricted && ["Accepted", "Unresolved"].includes(c.review),
    )
      ? "Include at least one audience-appropriate claim."
      : "",
  ].filter(Boolean);
}
export function plan(v?: HandoverVersion): PlanTask[] {
  return readerClaims(v).map((c, i) => ({
    id: `${v!.id}:${c.id}`,
    day: Math.min(i + 1, 5),
    title: (c.review === "Unresolved" ? "Clarify: " : "Review: ") + c.statement,
    priority: c.review === "Unresolved" || c.evidence === "Conflicting" ? "High" : "Normal",
    owner: v!.incoming,
    claim: c,
    dependency: "Read the linked evidence and reviewer notes first.",
  }));
}
export type Action =
  | { type: "role"; role: Role }
  | { type: "project"; id: string }
  | { type: "reset" }
  | { type: "connect"; source: SourceType }
  | { type: "restricted"; enabled: boolean }
  | { type: "members"; departing: string; incoming: string }
  | { type: "reconstruct" }
  | {
      type: "review";
      id: string;
      statement: string;
      owner: string;
      review: ReviewState;
      note: string;
      resolution: string;
      gapId?: string;
    }
  | { type: "approve"; audience: boolean; appropriate: boolean }
  | { type: "task"; id: string; done?: boolean; note?: string }
  | { type: "ack" };
