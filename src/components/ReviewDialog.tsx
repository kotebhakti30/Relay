import { useState } from "react";
import type { Claim, ReviewState, Gap } from "../domain/types";
import { useStore } from "../state/Store";
import { Modal, Badge } from "./UI";
export function ReviewDialog({
  claim,
  gap,
  onClose,
}: {
  claim: Claim;
  gap?: Gap;
  onClose: () => void;
}) {
  const { dispatch, p } = useStore();
  const [statement, setStatement] = useState(claim.statement);
  const [owner, setOwner] = useState(claim.owner);
  const [review, setReview] = useState<ReviewState>(
    claim.review === "Pending Review" ? "Accepted" : claim.review,
  );
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState(claim.resolution);
  return (
    <Modal
      title={gap ? "Resolve knowledge gap" : "Review claim"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            !(await dispatch({
              type: "review",
              id: claim.id,
              statement,
              owner,
              review,
              note,
              resolution,
              gapId: gap?.id,
            }))
          )
            return;
          onClose();
        }}
      >
        <div className="flex gap-2">
          <Badge>{claim.evidence}</Badge>
          <Badge>{claim.id}</Badge>
        </div>
        {gap && (
          <div className="note">
            <strong>{gap.title}</strong>
            <p>{gap.missing}</p>
            <p>{gap.impact}</p>
            <p>
              <strong>Next action:</strong> {gap.action}
            </p>
            <small>
              Clarify with {gap.clarify} · Original owner: {claim.owner}
            </small>
          </div>
        )}
        <label>
          Claim statement
          <textarea
            required
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
          />
        </label>
        <div className="form-grid">
          <label>
            Owner
            <select
              aria-label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              {Array.from(
                new Set([
                  claim.owner,
                  ...p.people.map(person => person.name),
                  ...p.claims.map(item => item.owner),
                  "Unassigned",
                ]),
              ).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Review decision
            <select
              aria-label="Review decision"
              value={review}
              onChange={(e) => setReview(e.target.value as ReviewState)}
            >
              {["Accepted", "Rejected", "Unresolved"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Review reason / notes
          <textarea
            required
            placeholder="Explain what you checked or why this remains unresolved."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label>
          Verification outcome{" "}
          {gap ? "(required to resolve gap)" : "(optional)"}
          <textarea
            required={!!gap}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Record a human verification, correction, or confirmed successor. This does not alter the original source."
          />
        </label>
        {claim.evidence !== "Supported" && (
          <p className="hint">
            To accept this claim, record a verification outcome. Otherwise
            choose Unresolved or Rejected. Approval checks this condition.
          </p>
        )}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save review
          </button>
        </div>
      </form>
    </Modal>
  );
}
