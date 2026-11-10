import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, Send, ShieldCheck, AlertCircle, Lock, ArrowUpRight, BookOpen } from "lucide-react";
import { useStore } from "../state/Store";

interface CitationClaim {
  id: string;
  statement: string;
  owner: string;
  category: string;
}

interface CitationSource {
  id: string;
  title: string;
  author: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  confidence?: "high" | "insufficient_evidence" | "restricted" | "general_knowledge";
  intent?: string;
  isGeneralKnowledge?: boolean;
  suggestedQuestions?: string[];
  citedClaims?: CitationClaim[];
  citedSources?: CitationSource[];
  timestamp: string;
}

export function AskRelay() {
  const { ask, state, p } = useStore();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        state.role === "incoming"
          ? `Hello ${p.incoming}. I am Ask Relay. I can answer questions about your handover using only approved, audience-permitted claims and verified source records.`
          : `Hello ${p.lead}. I am Ask Relay. I can answer questions about project knowledge, ownership, blockers, and decisions grounded in your connected evidence.`,
      confidence: "high",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSend(qText?: string) {
    const q = (qText || question).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const res = await ask(q);
      const assistantMsg: Message = {
        role: "assistant",
        content: res.answer,
        confidence: res.confidence,
        intent: res.intent,
        isGeneralKnowledge: res.isGeneralKnowledge,
        suggestedQuestions: res.suggestedQuestions || [],
        citedClaims: res.citedClaims || [],
        citedSources: res.citedSources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err?.message || "Failed to get an answer.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Ask Relay is currently unable to reach the Gemini service. " +
            (err?.message || "Please check your network and API configuration."),
          confidence: "insufficient_evidence",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const starters =
    state.role === "incoming"
      ? [
          "Who owns the nightly digest cron job?",
          "Is the payment API on staging fixed?",
          "What decisions were made about OAuth?",
        ]
      : [
          "What are the conflicting blockers?",
          "Who owns the nightly digest cron job?",
          "What lead-only risks are recorded?",
        ];

  return (
    <>
      {!open && (
        <button
          className="ask-relay-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open Ask Relay chatbot"
        >
          <Sparkles size={16} />
          <span>Ask Relay</span>
        </button>
      )}

      {open && (
        <aside className="ask-relay-drawer" aria-label="Ask Relay chat assistant">
          <header className="ask-relay-header">
            <div className="flex gap-2 items-center">
              <span className="ask-relay-icon">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>Ask Relay</strong>
                <small>Evidence-backed project assistant</small>
              </div>
            </div>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Close Ask Relay"
            >
              <X size={18} />
            </button>
          </header>

          <div className="ask-relay-scope-banner">
            <ShieldCheck size={14} />
            <span>
              {state.role === "incoming"
                ? "Answers only from approved, audience-permitted records."
                : "Full lead project visibility with citations."}
            </span>
          </div>

          <div className="ask-relay-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`ask-msg ${m.role}`}>
                <div className="ask-msg-bubble">
                  <p>{m.content}</p>

                  {m.confidence && m.role === "assistant" && (
                    <div className="ask-confidence">
                      {m.isGeneralKnowledge || m.confidence === "general_knowledge" ? (
                        <span className="conf-badge general">
                          <BookOpen size={12} /> General knowledge (not project data)
                        </span>
                      ) : m.confidence === "high" ? (
                        <span className="conf-badge high">
                          <ShieldCheck size={12} /> Verified evidence
                        </span>
                      ) : m.confidence === "restricted" ? (
                        <span className="conf-badge restricted">
                          <Lock size={12} /> Restricted for this role
                        </span>
                      ) : (
                        <span className="conf-badge low">
                          <AlertCircle size={12} /> Insufficient evidence
                        </span>
                      )}
                    </div>
                  )}

                  {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                    <div className="ask-followup-suggestions">
                      <small>Suggested questions:</small>
                      <div className="starter-list">
                        {m.suggestedQuestions.map((sq) => (
                          <button
                            key={sq}
                            type="button"
                            className="starter-btn"
                            onClick={() => handleSend(sq)}
                            disabled={loading}
                          >
                            {sq}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.citedClaims && m.citedClaims.length > 0 && (
                    <div className="ask-citations">
                      <small>Cited claims ({m.citedClaims.length}):</small>
                      <div className="citation-pills">
                        {m.citedClaims.map((c) => (
                          <Link
                            key={c.id}
                            to={`/evidence/${c.id}`}
                            className="citation-pill"
                            onClick={() => setOpen(false)}
                          >
                            <span>{c.category}: {c.statement.slice(0, 32)}…</span>
                            <ArrowUpRight size={12} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.citedSources && m.citedSources.length > 0 && (
                    <div className="ask-citations">
                      <small>Cited sources ({m.citedSources.length}):</small>
                      <div className="citation-pills">
                        {m.citedSources.map((s) => (
                          <Link
                            key={s.id}
                            to={`/record/${s.id}`}
                            className="citation-pill"
                            onClick={() => setOpen(false)}
                          >
                            <span>{s.title} ({s.id})</span>
                            <ArrowUpRight size={12} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="ask-timestamp">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="ask-msg assistant">
                <div className="ask-msg-bubble loading">
                  <Sparkles size={14} className="animate-spin" />
                  <span>Consulting permitted evidence…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="ask-starters">
              <small>Suggested questions:</small>
              <div className="starter-list">
                {starters.map((s) => (
                  <button
                    key={s}
                    className="starter-btn"
                    onClick={() => handleSend(s)}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="ask-error">{error}</div>}

          <form
            className="ask-relay-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder="Ask a question about the handover..."
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="primary"
              disabled={!question.trim() || loading}
              aria-label="Send question"
            >
              <Send size={15} />
            </button>
          </form>
          <div className="ask-char-count">
            <span>{question.length} / 500 characters</span>
          </div>
        </aside>
      )}
    </>
  );
}
