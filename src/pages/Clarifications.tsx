import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { Heading, Badge } from "../components/UI";
import { HelpCircle, CheckCircle2, Clock, Send, ArrowUpRight, AlertTriangle } from "lucide-react";
import type { ClarificationQuestion } from "../domain/types";

export function Clarifications() {
  const { p, state, fetchQuestions, answerClarification, busy } = useStore();
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "answered">("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isIncoming = state.role === "incoming";

  async function loadData() {
    if (!fetchQuestions) return;
    try {
      const list = await fetchQuestions();
      setQuestions(list || []);
    } catch {}
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSendAnswer(questionId: string) {
    if (!answerText.trim() || !answerClarification) return;
    setErrorMsg("");
    try {
      await answerClarification(questionId, answerText.trim());
      setSuccessMsg("Clarification recorded as evidence. Claim reset to Pending Review for lead approval.");
      setAnsweringId(null);
      setAnswerText("");
      await loadData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit answer.");
    }
  }

  const filtered = questions.filter((q) => {
    if (statusFilter === "open") return q.status === "open";
    if (statusFilter === "answered") return q.status === "answered";
    return true;
  });

  const openCount = questions.filter((q) => q.status === "open").length;

  return (
    <>
      <Heading
        eyebrow="05 / CLARIFICATION LOOP"
        title="Clarifications with the Departing Member"
        description="Ask targeted questions on uncertain or conflicting claims. Answers become verified evidence records and trigger re-review."
      />

      {successMsg && <div className="p-3 mb-4 bg-emerald-50 text-emerald-800 text-xs rounded-lg">{successMsg}</div>}
      {errorMsg && <div className="p-3 mb-4 bg-red-50 text-red-800 text-xs rounded-lg">{errorMsg}</div>}

      <div className="toolbar mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className={`button text-xs ${statusFilter === "all" ? "primary" : "secondary"}`}
            onClick={() => setStatusFilter("all")}
          >
            All Questions ({questions.length})
          </button>
          <button
            className={`button text-xs ${statusFilter === "open" ? "primary" : "secondary"}`}
            onClick={() => setStatusFilter("open")}
          >
            Open Inbox ({openCount})
          </button>
          <button
            className={`button text-xs ${statusFilter === "answered" ? "primary" : "secondary"}`}
            onClick={() => setStatusFilter("answered")}
          >
            Answered ({questions.length - openCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="panel text-center py-8">
          <HelpCircle size={36} className="mx-auto text-stone-300 mb-2" />
          <h3 className="font-semibold text-stone-700">No clarification questions in this view</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
            Questions can be created directly from the Knowledge Gap Radar or any candidate claim in Evidence Explorer.
          </p>
          <Link to="/gaps" className="button secondary text-xs inline-flex items-center gap-1 mt-4">
            Open Knowledge Gaps <ArrowUpRight size={13} />
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((q) => {
            const claim = p.claims.find((c) => c.id === q.claimId);
            return (
              <article className="panel border border-stone-200" key={q.id}>
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-amber-50 text-amber-800 rounded">
                      <HelpCircle size={16} />
                    </span>
                    <div>
                      <strong className="text-sm block">{q.question}</strong>
                      <small className="text-stone-500">
                        Assigned to: <strong>{q.assignedTo}</strong> · Asked by: {q.createdBy}
                        {q.dueDate && ` · Due: ${q.dueDate}`}
                      </small>
                    </div>
                  </div>
                  <Badge>
                    {q.status === "open" ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <Clock size={12} /> Awaiting Answer
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 size={12} /> Answered
                      </span>
                    )}
                  </Badge>
                </div>

                {claim && (
                  <div className="p-2.5 my-2 bg-stone-50 rounded text-xs flex justify-between items-center">
                    <div>
                      <span className="text-stone-500 block text-[11px]">Linked Claim:</span>
                      <strong>{claim.statement}</strong>
                    </div>
                    <Link to={`/evidence/${claim.id}`} className="text-emerald-800 font-medium inline-flex items-center gap-0.5 hover:underline">
                      View Evidence <ArrowUpRight size={12} />
                    </Link>
                  </div>
                )}

                {q.answer ? (
                  <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-100 rounded text-xs">
                    <div className="flex items-center justify-between text-emerald-900 font-semibold mb-1">
                      <span>Answer provided by {q.answer.answeredBy}:</span>
                      <small className="text-stone-400 font-normal">{new Date(q.answer.answeredAt).toLocaleString()}</small>
                    </div>
                    <p className="text-stone-800 whitespace-pre-wrap">{q.answer.text}</p>
                    <span className="text-[10px] text-emerald-700 font-mono mt-1 block">
                      Evidence ID: CLR-{q.id.slice(0, 8)} · Added to Claim References · Pending Re-Review
                    </span>
                  </div>
                ) : (
                  <div className="mt-3">
                    {answeringId === q.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          placeholder={`Provide the missing context or factual answer as ${q.assignedTo}…`}
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={3}
                          className="input-field text-xs"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            className="button secondary text-xs"
                            onClick={() => {
                              setAnsweringId(null);
                              setAnswerText("");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="button primary text-xs flex items-center gap-1"
                            onClick={() => handleSendAnswer(q.id)}
                            disabled={!answerText.trim() || busy}
                          >
                            <Send size={13} /> Submit Answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="button primary text-xs flex items-center gap-1"
                        onClick={() => {
                          setAnsweringId(q.id);
                          setAnswerText("");
                        }}
                      >
                        Answer this question
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
