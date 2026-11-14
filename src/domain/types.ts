export type Role = "reviewer" | "incoming" | "departing";
export type SourceType = "github" | "notes" | "board" | "chat" | "clarification";
export type EvidenceState =
  "Supported" | "Conflicting" | "Insufficient Evidence";
export type ReviewState =
  "Pending Review" | "Accepted" | "Rejected" | "Unresolved";
export type Category =
  | "Decisions"
  | "Blockers"
  | "Ownership"
  | "Dependencies"
  | "Risks"
  | "Next actions"
  | "Unresolved questions";
export interface SourceRecord {
  id: string;
  title: string;
  type: SourceType;
  author: string;
  timestamp: string;
  reference: string;
  access: "team" | "reviewer";
  content: string;
  entities: string[];
}
export interface Claim {
  id: string;
  statement: string;
  category: Category;
  owner: string;
  evidence: EvidenceState;
  review: ReviewState;
  refs: string[];
  labelHistory?: { label: string; at: string; count: number }[];
  quotes?: Record<string, string>;
  extractor?: string;
  explanation: string;
  restricted: boolean;
  note: string;
  resolution: string;
  updated: string;
}
export interface Gap {
  id: string;
  claimId: string;
  type: string;
  severity: "High" | "Medium" | "Low";
  title: string;
  missing: string;
  impact: string;
  action: string;
  clarify: string;
}
export interface ReviewAction {
  id: string;
  claimId: string;
  before: Claim;
  after: Claim;
  actor: string;
  at: string;
  reason: string;
}
export interface AuditEvent {
  id: string;
  type: string;
  detail: string;
  at: string;
  actor: string;
  claimId?: string;
}
export interface HandoverVersion {
  id: number;
  claims: Claim[];
  records: SourceRecord[];
  at: string;
  audience: "Incoming Developer";
  author: string;
  departing: string;
  incoming: string;
  acknowledged?: string;
}
export interface TaskProgress {
  done: boolean;
  note: string;
}
export interface ProjectState {
  name: string;
  organisation: string;
  code: string;
  description: string;
  sample: boolean;
  lead: string;
  people: {name: string; role: string}[];
  sharing?: { link: string; code: string } | null;
  records?: SourceRecord[];
  connections: SourceType[];
  restrictedEnabled: boolean;
  claims: Claim[];
  resolvedGaps: string[];
  reviews: ReviewAction[];
  events: AuditEvent[];
  versions: HandoverVersion[];
  tasks: Record<string, TaskProgress>;
  run: number;
  dirty: boolean;
  departing: string;
  incoming: string;
}
export interface State {
  schema: 1;
  role: Role;
  projectId: string;
  projects: Record<string, ProjectState>;
}
export interface PlanTask {
  id: string;
  day: number;
  title: string;
  priority: string;
  owner: string;
  claim: Claim;
  dependency: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
}

export interface Organisation {
  id: string;
  name: string;
  role: "admin" | "member";
}

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  description: string;
  workspaceId: string;
  departing: string;
  departingRole: string;
  incoming: string;
  incomingRole: string;
  role: string;
  createdAt: string;
}

export interface ClarificationQuestion {
  id: string;
  claimId: string;
  gapId?: string;
  question: string;
  assignedTo: string;
  dueDate?: string;
  status: "open" | "answered" | "closed";
  createdBy: string;
  createdAt: string;
  answer?: {
    id: string;
    text: string;
    answeredBy: string;
    answeredAt: string;
  };
}

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  summary: string;
  added: any[];
  removed: any[];
  changed: any[];
  unchangedCount: number;
  hasMaterialChanges: boolean;
  role: Role;
}
