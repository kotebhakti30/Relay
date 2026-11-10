import type { Gap } from "../domain/types";
export const gaps: Gap[] = [
  {
    id: "gap-payment",
    claimId: "payment",
    type: "Conflicting status",
    severity: "High",
    title: "Is the payment fix actually ready?",
    missing: "The open issue and staging message disagree.",
    impact: "A premature release could repeat the payment failures.",
    action: "Verify the staging fix, record the outcome and correct the claim.",
    clarify: "Aarav",
  },
  {
    id: "gap-cron",
    claimId: "cron",
    type: "Stale ownership",
    severity: "High",
    title: "Cron job ownership needs a successor",
    missing:
      "The ownership card is six weeks old and names Aarav, with no confirmed successor.",
    impact: "The nightly digest may have no accountable owner.",
    action: "Assign a successor and record their acceptance.",
    clarify: "Riya",
  },
];
