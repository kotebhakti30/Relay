import { useState, useEffect } from "react";
import { useStore } from "../state/Store";
import { Heading, Badge } from "../components/UI";
import { Building2, Users, Shield, Save, UserPlus, Check, ArrowRight } from "lucide-react";

export function Settings() {
  const { p, user, org, orgs, updateOrgName, fetchOrgDetails, inviteMember, busy } = useStore();
  const [orgName, setOrgName] = useState(org?.name || p.organisation);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "reviewer" | "incoming">("reviewer");
  const [inviteLink, setInviteLink] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isAdmin = org?.role === "admin" || !user;

  useEffect(() => {
    if (org?.id && fetchOrgDetails) {
      fetchOrgDetails(org.id).then((data) => {
        if (data?.members) setMembers(data.members);
      }).catch(() => {});
    }
  }, [org?.id]);

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim() || !updateOrgName || !org?.id) return;
    setErrorMsg("");
    try {
      await updateOrgName(org.id, orgName.trim());
      setSavedMsg("Organisation name updated successfully.");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update organisation.");
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteMember) return;
    setErrorMsg("");
    try {
      const res = await inviteMember(inviteRole);
      if (res?.token) {
        const link = `${window.location.origin}${window.location.pathname}#/invite?token=${res.token}`;
        setInviteLink(link);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate invite link.");
    }
  }

  return (
    <>
      <Heading
        eyebrow="SETTINGS"
        title="Organisation & Members"
        description="Manage your organisation name, review active members, and generate role-based project invites."
      />

      <div className="two-col mt-4">
        {/* Organisation Profile */}
        <section className="panel">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold">Organisation Details</h2>
              <small className="text-stone-500">Workspace tenant profile</small>
            </div>
          </div>

          {savedMsg && <div className="p-2 mb-3 bg-emerald-50 text-emerald-800 text-xs rounded">{savedMsg}</div>}
          {errorMsg && <div className="p-2 mb-3 bg-red-50 text-red-800 text-xs rounded">{errorMsg}</div>}

          <form onSubmit={handleSaveOrg} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Organisation Name
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isAdmin || busy}
                className="input-field"
                required
              />
            </label>

            {isAdmin && (
              <button type="submit" className="button primary text-xs self-start flex items-center gap-1" disabled={busy}>
                <Save size={14} /> Save Name
              </button>
            )}
            {!isAdmin && <small className="text-stone-400">Only organisation administrators can rename the organisation.</small>}
          </form>
        </section>

        {/* Invite Member */}
        <section className="panel">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              <UserPlus size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold">Invite to Project</h2>
              <small className="text-stone-500">Expiring, revocable role invite</small>
            </div>
          </div>

          <form onSubmit={handleCreateInvite} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Assign Role for Recipient
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="input-field text-xs"
              >
                <option value="reviewer">Reviewer (Can review claims and inspect evidence)</option>
                <option value="incoming">Incoming Member (Sees only approved, permitted handover)</option>
                <option value="admin">Admin / Lead (Full access and approval permissions)</option>
              </select>
            </label>

            <button type="submit" className="button secondary text-xs self-start flex items-center gap-1" disabled={busy}>
              Generate 48-Hour Invite Link
            </button>
          </form>

          {inviteLink && (
            <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded text-xs">
              <span className="font-semibold block mb-1">Share this invite link:</span>
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="input-field font-mono text-xs w-full bg-white select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <small className="text-stone-500 block mt-1">
                Link expires in 48 hours and assigns the <strong>{inviteRole}</strong> role upon signup/login.
              </small>
            </div>
          )}
        </section>
      </div>

      {/* Members Directory */}
      <section className="panel mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-stone-600" />
            <h2 className="text-base font-bold">Active Members</h2>
          </div>
          <span className="text-xs text-stone-500">{members.length || p.people.length} people</span>
        </div>

        <div className="team-grid">
          {members.length > 0 ? (
            members.map((m) => (
              <div className="team-member" key={m.id || m.email}>
                <span className="avatar mint">{m.name?.[0] || "U"}</span>
                <strong>{m.name}</strong>
                <small className="text-stone-500">{m.email}</small>
                <span className="mt-1">
                  <Badge>{m.role === "admin" ? "Admin" : "Member"}</Badge>
                </span>
              </div>
            ))
          ) : (
            p.people.map(({ name, role }) => (
              <div className="team-member" key={name}>
                <span className="avatar mint">{name[0]}</span>
                <strong>{name}</strong>
                <small>{role}</small>
                <span className="mt-1">
                  <Badge>{role.toLowerCase().includes("lead") ? "Admin" : "Member"}</Badge>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
