import { useState, useEffect } from "react";
import { useStore } from "../state/Store";
import { Heading, Badge, date, Modal, Evidence } from "../components/UI";
import { VersionDiffViewer } from "../components/VersionDiffViewer";
import type { Claim, HandoverVersion, VersionDiff } from "../domain/types";
export function History() {
  const { p, fetchDiff } = useStore();
  const [filter, setFilter] = useState("All events");
  const [version, setVersion] = useState<HandoverVersion | null>(null);
  const [base, setBase] = useState("");
  const [target, setTarget] = useState("");
  const [inspect, setInspect] = useState<Claim | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    if (base && target && fetchDiff) {
      setDiffLoading(true);
      fetchDiff(Number(base), Number(target))
        .then((res) => {
          setDiff(res);
          setDiffLoading(false);
        })
        .catch(() => {
          const fromV = p.versions.find((v) => String(v.id) === base);
          const toV = p.versions.find((v) => String(v.id) === target);
          if (fromV && toV) {
            const fromClaims = fromV.claims;
            const toClaims = toV.claims;
            const fromIds = new Set(fromClaims.map((c) => c.id));
            const toIds = new Set(toClaims.map((c) => c.id));
            const added = toClaims.filter((c) => !fromIds.has(c.id));
            const removed = fromClaims.filter((c) => !toIds.has(c.id));
            const changed: any[] = [];
            for (const tc of toClaims) {
              const fc = fromClaims.find((c) => c.id === tc.id);
              if (fc && JSON.stringify(fc) !== JSON.stringify(tc)) {
                changed.push({
                  id: tc.id,
                  statement: tc.statement,
                  before: fc,
                  after: tc,
                  changes: [
                    ...(fc.owner !== tc.owner ? [{ field: "owner", before: fc.owner, after: tc.owner }] : []),
                    ...(fc.review !== tc.review ? [{ field: "review", before: fc.review, after: tc.review }] : []),
                    ...(fc.statement !== tc.statement ? [{ field: "statement", before: fc.statement, after: tc.statement }] : []),
                    ...(fc.note !== tc.note ? [{ field: "note", before: fc.note, after: tc.note }] : []),
                  ],
                });
              }
            }
            setDiff({
              fromVersion: Number(base),
              toVersion: Number(target),
              added,
              removed,
              changed,
              unchangedCount: toClaims.length - added.length - changed.length,
              role: "reviewer",
              summary: `${added.length} added, ${removed.length} removed, ${changed.length} changed`,
              hasMaterialChanges: added.length > 0 || removed.length > 0 || changed.some((c: any) => c.changes.some((ch: any) => ch.field === "owner" || ch.field === "review")),
            });
          }
          setDiffLoading(false);
        });
    } else {
      setDiff(null);
    }
  }, [base, target, p.versions]);
  const a = p.versions.find((v) => String(v.id) === base);
  const b = p.versions.find((v) => String(v.id) === target);
  const changes =
    a && b
      ? [...new Set([...a.claims, ...b.claims].map((c) => c.id))]
          .map((id) => ({
            id,
            before: a.claims.find((c) => c.id === id),
            after: b.claims.find((c) => c.id === id),
          }))
          .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after))
      : [];
  return (
    <>
      <Heading
        eyebrow="ACTIVITY & VERSION HISTORY"
        title="A record of how we got here."
        description="Workspace activity stored in PostgreSQL. Previous approvals stay intact when the draft changes."
      />
      <section className="panel">
        <h2>Approved handover versions</h2>
        {!p.versions.length ? (
          <p>
            No versions yet. Complete review and approval to create the first
            snapshot.
          </p>
        ) : (
          <div className="version-list">
            {p.versions.map((v) => (
              <button
                key={v.id}
                className="version-card"
                onClick={() => setVersion(v)}
              >
                <Badge>Approved</Badge>
                <strong>Version {v.id}</strong>
                <small>
                  {date(v.at)} · {v.claims.length} claims
                </small>
                <small>
                  {v.acknowledged ? "Receipt acknowledged" : "Awaiting receipt"}
                </small>
              </button>
            ))}
          </div>
        )}
        {p.versions.length > 1 && (
          <>
            <h3>Compare versions</h3>
            <div className="toolbar">
              <select
                aria-label="Base version"
                value={base}
                onChange={(e) => setBase(e.target.value)}
              >
                <option value="">From version</option>
                {p.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    Version {v.id}
                  </option>
                ))}
              </select>
              <select
                aria-label="Target version"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">To version</option>
                {p.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    Version {v.id}
                  </option>
                ))}
              </select>
            </div>
            {a && b && (
              <div className="mt-4">
                <VersionDiffViewer diff={diff} loading={diffLoading} />
              </div>
            )}
          </>
        )}
      </section>
      <section className="panel mt-6">
        <div className="section-heading">
          <h2>Activity log</h2>
          <select
            aria-label="History filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All events", ...new Set(p.events.map((e) => e.type))].map(
              (t) => (
                <option key={t}>{t}</option>
              ),
            )}
          </select>
        </div>
        {p.events
          .filter((e) => filter === "All events" || e.type === filter)
          .map((e) => (
            <div className="history-event" key={e.id}>
              <Badge>{e.type}</Badge>
              <div>
                <strong>{e.detail}</strong>
                <small>
                  {e.actor} ·{" "}
                  {new Date(e.at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </small>
                {e.claimId && (
                  <details>
                    <summary>Inspect claim change</summary>
                    {p.reviews
                      .filter((r) => r.claimId === e.claimId && r.at === e.at)
                      .map((r) => (
                        <div className="diff" key={r.id}>
                          <p>
                            Before: {r.before.statement} · {r.before.owner} ·{" "}
                            {r.before.review}
                          </p>
                          <p>
                            After: {r.after.statement} · {r.after.owner} ·{" "}
                            {r.after.review}
                          </p>
                          <p>Reason: {r.reason}</p>
                          <p>
                            Verification: {r.after.resolution || "Not recorded"}
                          </p>
                        </div>
                      ))}
                  </details>
                )}
              </div>
            </div>
          ))}
        {!p.events.length && (
          <p>Your first source connection will start the activity trail.</p>
        )}
      </section>
      {version && (
        <Modal
          title={`Handover version ${version.id}`}
          onClose={() => {
            setVersion(null);
            setInspect(null);
          }}
        >
          <p>
            Approved for {version.audience} · {date(version.at)}. This snapshot
            is preserved independently of the draft.
          </p>
          {inspect ? (
            <>
              <button onClick={() => setInspect(null)}>
                Back to version claims
              </button>
              <Evidence claim={inspect} records={version.records} />
            </>
          ) : (
            version.claims.map((c) => (
              <button
                className="version-claim"
                key={c.id}
                onClick={() => setInspect(c)}
              >
                <strong>{c.statement}</strong>
                <Badge>{c.review}</Badge>
              </button>
            ))
          )}
        </Modal>
      )}
    </>
  );
}
