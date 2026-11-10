import { randomUUID } from "node:crypto";
export const sampleProject = {
  name: "CampusConnect", organisation: "CampusConnect", code: "CC",
  description: "Student collaboration platform", sample: true,
  lead: "Riya", departing: "Aarav", incoming: "Neha",
  people: [
    {name: "Riya", role: "Team lead"}, {name: "Aarav", role: "Backend developer"},
    {name: "Neha", role: "Incoming developer"}, {name: "Kabir", role: "Frontend developer"}
  ]
};
export const samples = [
  [
    "GH-34",
    "Issue #34 · Payment API failures",
    "github",
    "Aarav",
    "Payment API on staging is blocked. Issue #34 is open.",
    "all",
    1,
  ],
  [
    "CH-1",
    "Backend channel · Staging update",
    "chat",
    "Aarav",
    "Payment API on staging is fixed.",
    "all",
    1,
  ],
  [
    "TB-1",
    "Nightly digest · Ownership",
    "board",
    "Riya",
    "Aarav owns the nightly digest cron job.",
    "all",
    45,
  ],
  [
    "MN-1",
    "Sprint planning · OAuth",
    "notes",
    "Riya",
    "We decided to defer OAuth until sprint 4.",
    "all",
    2,
  ],
  [
    "CH-R1",
    "Lead-only · Vendor contingency",
    "chat",
    "Riya",
    "Vendor contingency is a budget risk pending lead review.",
    "lead_only",
    1,
  ],
];
export async function seed(client) {
  const w = randomUUID();
  await client.query("INSERT INTO workspaces(id) VALUES ($1)", [w]);
  await client.query(
    "INSERT INTO users VALUES ($1,'reviewer','Riya'),($1,'incoming','Neha')",
    [w],
  );
  for (const [id, title, type, author, text, visibility, days] of samples)
    await client.query(
      "INSERT INTO source_records VALUES ($1,$2,$3,$4,$5,now()-$6::int*interval '1 day',$7,$8)",
      [w, id, title, type, author, days, text, visibility],
    );
  await client.query(
    "INSERT INTO audit_log(workspace,actor,type,detail) VALUES ($1,'Riya','Workspace','Created CampusConnect with five initial records.')",
    [w],
  );
  return w;
}
