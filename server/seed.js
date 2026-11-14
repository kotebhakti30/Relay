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
  await client.query("INSERT INTO workspaces(id, run) VALUES ($1, 1)", [w]);
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

  // Automatically extract and seed the 5 standard candidate claims with payment in conflicting state
  const records = samples.map(([id, title, type, author, text, visibility, days]) => ({
    id,
    title,
    type,
    author,
    text,
    visibility,
    recorded_at: new Date(Date.now() - days * 86400000).toISOString(),
  }));
  const { extract } = await import("./extract.js");
  const { claims } = await extract(records);
  for (const c of claims) {
    await client.query("INSERT INTO claims VALUES($1,$2,$3)", [w, c.id, c]);
    for (const rid of c.refs) {
      if (c.quotes?.[rid]) {
        await client.query("INSERT INTO evidence_links VALUES($1,$2,$3,$4)", [
          w,
          c.id,
          rid,
          c.quotes[rid],
        ]);
      }
    }
  }

  return w;
}
