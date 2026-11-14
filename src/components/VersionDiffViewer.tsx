import { useState, useEffect } from "react";
import { GitCompare, Plus, Minus, Edit3, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Badge } from "./UI";
import type { VersionDiff } from "../domain/types";

interface DiffViewerProps {
  diff: VersionDiff | null;
  loading?: boolean;
}

export function VersionDiffViewer({ diff, loading }: DiffViewerProps) {
  if (loading) {
    return <div className="p-4 text-center text-xs text-stone-500">Computing snapshot diff…</div>;
  }

  if (!diff) {
    return (
      <div className="p-4 text-center text-xs text-stone-500">
        Select two versions above to inspect the changes.
      </div>
    );
  }

  const { added, removed, changed, summary, fromVersion, toVersion, hasMaterialChanges } = diff;

  return (
    <div className="diff-viewer flex flex-col gap-4 mt-3">
      <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex justify-between items-center text-xs">
        <div>
          <span className="font-semibold block text-stone-800">
            Comparing v{fromVersion || "Draft"} <ArrowRight size={12} className="inline mx-1" /> v{toVersion}
          </span>
          <span className="text-stone-600">{summary}</span>
        </div>
        {hasMaterialChanges && (
          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
            <AlertCircle size={12} /> Material changes detected
          </span>
        )}
      </div>

      {/* Added Claims */}
      {added.length > 0 && (
        <section className="diff-section">
          <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1 mb-2">
            <Plus size={14} /> Added Claims ({added.length})
          </h4>
          <div className="flex flex-col gap-2">
            {added.map((c) => (
              <div key={c.id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded text-xs">
                <div className="flex justify-between items-start mb-1">
                  <strong>{c.statement}</strong>
                  <Badge>{c.category}</Badge>
                </div>
                <div className="text-stone-500 text-[11px]">
                  Owner: <strong>{c.owner}</strong> · Status: {c.review} · Evidence: {c.evidence}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modified Claims */}
      {changed.length > 0 && (
        <section className="diff-section">
          <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1 mb-2">
            <Edit3 size={14} /> Modified Claims ({changed.length})
          </h4>
          <div className="flex flex-col gap-3">
            {changed.map((c) => (
              <div key={c.id} className="p-3 bg-amber-50/40 border border-amber-200 rounded text-xs flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[11px] text-stone-500">Claim · {c.id}</span>
                  <Badge>{c.category}</Badge>
                </div>

                {c.changes.statement && (
                  <div className="diff-field">
                    <span className="text-[11px] font-semibold text-stone-600 block">Statement change:</span>
                    <div className="bg-red-50 text-red-900 p-1.5 rounded line-through text-[11px] mb-1">
                      {c.changes.statement.from}
                    </div>
                    <div className="bg-emerald-50 text-emerald-900 p-1.5 rounded text-[11px]">
                      {c.changes.statement.to}
                    </div>
                  </div>
                )}

                {c.changes.owner && (
                  <div className="text-[11px]">
                    <span className="font-semibold text-stone-600">Owner re-assigned: </span>
                    <span className="line-through text-red-700 mr-2">{c.changes.owner.from}</span>
                    <ArrowRight size={10} className="inline mx-1" />
                    <span className="text-emerald-800 font-bold">{c.changes.owner.to}</span>
                  </div>
                )}

                {c.changes.review && (
                  <div className="text-[11px]">
                    <span className="font-semibold text-stone-600">Decision changed: </span>
                    <span className="line-through text-stone-500 mr-1">{c.changes.review.from}</span>
                    <ArrowRight size={10} className="inline mx-1" />
                    <span className="font-semibold text-stone-800">{c.changes.review.to}</span>
                  </div>
                )}

                {c.changes.evidence && (
                  <div className="text-[11px]">
                    <span className="font-semibold text-stone-600">Evidence state: </span>
                    <span className="text-stone-500 mr-1">{c.changes.evidence.from}</span>
                    <ArrowRight size={10} className="inline mx-1" />
                    <span className="font-semibold text-stone-800">{c.changes.evidence.to}</span>
                  </div>
                )}

                {c.changes.note && (
                  <div className="text-[11px] bg-white p-2 rounded border border-stone-200">
                    <span className="font-semibold text-stone-600 block">Reviewer note updated:</span>
                    <p className="text-stone-700 italic">{c.changes.note.to}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Removed Claims */}
      {removed.length > 0 && (
        <section className="diff-section">
          <h4 className="text-xs font-bold text-red-800 flex items-center gap-1 mb-2">
            <Minus size={14} /> Removed Claims ({removed.length})
          </h4>
          <div className="flex flex-col gap-2">
            {removed.map((c) => (
              <div key={c.id} className="p-3 bg-red-50/50 border border-red-200 rounded text-xs">
                <div className="flex justify-between items-start mb-1 line-through text-stone-600">
                  <span>{c.statement}</span>
                  <Badge>{c.category}</Badge>
                </div>
                <div className="text-stone-400 text-[11px]">Previously owned by {c.owner}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
