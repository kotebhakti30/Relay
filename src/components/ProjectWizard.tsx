import { useState } from "react";
import { FolderPlus, Users, ArrowRight, ArrowLeft, Check, Sparkles, X } from "lucide-react";

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  busy?: boolean;
}

export function ProjectWizard({ isOpen, onClose, onSubmit, busy }: WizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [departingName, setDepartingName] = useState("");
  const [departingRole, setDepartingRole] = useState("Lead Backend Engineer");
  const [departingLastDay, setDepartingLastDay] = useState("Two weeks from now");
  const [incomingName, setIncomingName] = useState("");
  const [incomingRole, setIncomingRole] = useState("Senior Software Engineer");
  const [members, setMembers] = useState<string>("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleFinish() {
    if (!name.trim()) {
      setError("Project name is required.");
      setStep(1);
      return;
    }
    if (!departingName.trim()) {
      setError("Departing person's name is required.");
      setStep(2);
      return;
    }
    if (!incomingName.trim()) {
      setError("Incoming person's name is required.");
      setStep(3);
      return;
    }

    const teamList = [
      { name: departingName.trim(), role: departingRole.trim() },
      { name: incomingName.trim(), role: incomingRole.trim() },
    ];

    if (members.trim()) {
      const extra = members
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m) => {
          const [n, r] = m.split("-").map((s) => s.trim());
          return { name: n, role: r || "Team Member" };
        });
      teamList.push(...extra);
    }

    setError("");
    const success = await onSubmit({
      name: name.trim(),
      code: code.trim() || name.trim().slice(0, 4).toUpperCase(),
      description: description.trim() || "Project knowledge handover",
      departingName: departingName.trim(),
      departingRole: departingRole.trim(),
      departingLastDay: departingLastDay.trim(),
      incomingName: incomingName.trim(),
      incomingRole: incomingRole.trim(),
      teamMembers: teamList,
    });

    if (success) {
      onClose();
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className="modal-panel wizard-modal">
        <header className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              <FolderPlus size={20} />
            </span>
            <div>
              <h2 id="wizard-title" className="text-lg font-bold">New Handover Project</h2>
              <small className="text-stone-500">Step {step} of 4</small>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close wizard" disabled={busy}>
            <X size={18} />
          </button>
        </header>

        {error && <div className="p-3 mb-4 bg-red-50 text-red-800 text-sm rounded-lg">{error}</div>}

        {step === 1 && (
          <div className="wizard-step flex flex-col gap-3">
            <p className="text-sm text-stone-600">
              Set up your project details. All notes, candidate claims, and handover versions will belong to this project.
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Project Name *
              <input
                type="text"
                placeholder="e.g. Core Payment Gateway"
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) setCode(e.target.value.slice(0, 4).toUpperCase());
                }}
                className="input-field"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Project Code (optional)
              <input
                type="text"
                placeholder="e.g. PAY"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input-field"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Description
              <textarea
                placeholder="What does this project do and what is the context for this handover?"
                value={description}
                maxLength={500}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step flex flex-col gap-3">
            <p className="text-sm text-stone-600">
              Who is departing? The knowledge extracted from notes and chats will be centered on their responsibilities.
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Departing Person Name *
              <input
                type="text"
                placeholder="e.g. Carlos Ramos"
                value={departingName}
                maxLength={80}
                onChange={(e) => setDepartingName(e.target.value)}
                className="input-field"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Current Role
              <input
                type="text"
                placeholder="e.g. Principal Systems Architect"
                value={departingRole}
                maxLength={80}
                onChange={(e) => setDepartingRole(e.target.value)}
                className="input-field"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Last Day / Transition Target
              <input
                type="text"
                placeholder="e.g. Friday, Dec 15, 2026"
                value={departingLastDay}
                maxLength={60}
                onChange={(e) => setDepartingLastDay(e.target.value)}
                className="input-field"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step flex flex-col gap-3">
            <p className="text-sm text-stone-600">
              Who is taking over? The final handover snapshot and first-week continuation plan will be tailored for them.
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Incoming Person Name *
              <input
                type="text"
                placeholder="e.g. Elena Rostova"
                value={incomingName}
                maxLength={80}
                onChange={(e) => setIncomingName(e.target.value)}
                className="input-field"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Incoming Role
              <input
                type="text"
                placeholder="e.g. Senior Infrastructure Engineer"
                value={incomingRole}
                maxLength={80}
                onChange={(e) => setIncomingRole(e.target.value)}
                className="input-field"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step flex flex-col gap-3">
            <p className="text-sm text-stone-600">
              Additional team members involved in reviews or task ownership (one per line, format: <code>Name - Role</code>).
            </p>
            <textarea
              placeholder="Maya Patel - Director of Engineering&#10;Arun Rao - DevOps Lead"
              value={members}
              rows={4}
              onChange={(e) => setMembers(e.target.value)}
              className="input-field font-mono text-xs"
            />
            <div className="p-3 bg-stone-50 rounded text-xs text-stone-600">
              <strong>Summary:</strong> Handover from <strong>{departingName || "Departing"}</strong> ({departingRole}) to <strong>{incomingName || "Incoming"}</strong> ({incomingRole}).
            </div>
          </div>
        )}

        <footer className="flex justify-between items-center mt-6 pt-4 border-t border-stone-200">
          {step > 1 ? (
            <button
              type="button"
              className="button secondary flex items-center gap-1"
              onClick={() => setStep(step - 1)}
              disabled={busy}
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              className="button primary flex items-center gap-1"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setError("Project name is required.");
                  return;
                }
                if (step === 2 && !departingName.trim()) {
                  setError("Departing person's name is required.");
                  return;
                }
                if (step === 3 && !incomingName.trim()) {
                  setError("Incoming person's name is required.");
                  return;
                }
                setError("");
                setStep(step + 1);
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="button primary flex items-center gap-1"
              onClick={handleFinish}
              disabled={busy}
            >
              <Check size={16} /> {busy ? "Creating Project…" : "Create & Open Project"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
