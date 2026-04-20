import { db, query, get, run } from "./db.js";
import { nanoid } from "./nanoid.js";

interface Event {
  id: number;
  slug: string;
  title: string;
  admin_token: string;
  created_at: string;
}

interface Candidate {
  id: number;
  event_id: number;
  label: string;
  sort_order: number;
}

interface Response {
  id: number;
  event_id: number;
  name: string;
  created_at: string;
}

interface Vote {
  response_id: number;
  candidate_id: number;
  value: "yes" | "maybe" | "no";
}

export function createEvent(title: string, candidates: string[]) {
  const slug = nanoid();
  const admin_token = nanoid(16);

  const insert = db.transaction(() => {
    run("INSERT INTO events (slug, title, admin_token) VALUES (?, ?, ?)", slug, title, admin_token);
    const event = get<Event>("SELECT id FROM events WHERE slug = ?", slug)!;
    for (let i = 0; i < candidates.length; i++) {
      run(
        "INSERT INTO candidates (event_id, label, sort_order) VALUES (?, ?, ?)",
        event.id,
        candidates[i],
        i,
      );
    }
  });
  insert();

  return { slug, admin_token };
}

export function getEvent(slug: string) {
  const event = get<Event>("SELECT id, slug, title, created_at FROM events WHERE slug = ?", slug);
  if (!event) return null;

  const candidates = query<Candidate>(
    "SELECT id, label, sort_order FROM candidates WHERE event_id = ? ORDER BY sort_order",
    event.id,
  );

  const responses = query<Response>(
    "SELECT id, name, created_at FROM responses WHERE event_id = ? ORDER BY id",
    event.id,
  );

  const votes = query<Vote>(
    `SELECT v.response_id, v.candidate_id, v.value
     FROM votes v
     JOIN responses r ON r.id = v.response_id
     WHERE r.event_id = ?`,
    event.id,
  );

  const voteMap = new Map<number, Record<number, string>>();
  for (const v of votes) {
    if (!voteMap.has(v.response_id)) voteMap.set(v.response_id, {});
    voteMap.get(v.response_id)![v.candidate_id] = v.value;
  }

  const summary: Record<number, { yes: number; maybe: number; no: number }> = {};
  for (const c of candidates) {
    summary[c.id] = { yes: 0, maybe: 0, no: 0 };
  }
  for (const v of votes) {
    if (summary[v.candidate_id]) {
      summary[v.candidate_id][v.value]++;
    }
  }

  let bestId: number | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    const s = summary[c.id];
    const score = s.yes * 2 + s.maybe;
    if (score > bestScore) {
      bestScore = score;
      bestId = c.id;
    }
  }

  return {
    event: { title: event.title, slug: event.slug, created_at: event.created_at },
    candidates: candidates.map((c) => ({ id: c.id, label: c.label })),
    responses: responses.map((r) => ({
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      votes: voteMap.get(r.id) || {},
    })),
    summary,
    bestId: bestScore > 0 ? bestId : null,
  };
}

export function addResponse(slug: string, name: string, votes: Record<number, string>) {
  const event = get<Event>("SELECT id FROM events WHERE slug = ?", slug);
  if (!event) return null;

  const validValues = new Set(["yes", "maybe", "no"]);
  const candidates = query<Candidate>("SELECT id FROM candidates WHERE event_id = ?", event.id);
  const candidateIds = new Set(candidates.map((c) => c.id));

  const insert = db.transaction(() => {
    run("INSERT INTO responses (event_id, name) VALUES (?, ?)", event.id, name);
    const resp = get<{ id: number }>("SELECT last_insert_rowid() as id")!;
    for (const [cidStr, value] of Object.entries(votes)) {
      const cid = Number(cidStr);
      if (candidateIds.has(cid) && validValues.has(value)) {
        run("INSERT INTO votes (response_id, candidate_id, value) VALUES (?, ?, ?)", resp.id, cid, value);
      }
    }
    return resp.id;
  });

  return { id: insert() };
}

export function updateResponse(slug: string, responseId: number, name: string, votes: Record<number, string>) {
  const event = get<Event>("SELECT id FROM events WHERE slug = ?", slug);
  if (!event) return false;

  const resp = get<Response>("SELECT id FROM responses WHERE id = ? AND event_id = ?", responseId, event.id);
  if (!resp) return false;

  const validValues = new Set(["yes", "maybe", "no"]);
  const candidates = query<Candidate>("SELECT id FROM candidates WHERE event_id = ?", event.id);
  const candidateIds = new Set(candidates.map((c) => c.id));

  const update = db.transaction(() => {
    run("UPDATE responses SET name = ? WHERE id = ?", name, responseId);
    run("DELETE FROM votes WHERE response_id = ?", responseId);
    for (const [cidStr, value] of Object.entries(votes)) {
      const cid = Number(cidStr);
      if (candidateIds.has(cid) && validValues.has(value)) {
        run("INSERT INTO votes (response_id, candidate_id, value) VALUES (?, ?, ?)", responseId, cid, value);
      }
    }
  });
  update();

  return true;
}

export function deleteEvent(slug: string, adminToken: string) {
  const event = get<Event>("SELECT id, admin_token FROM events WHERE slug = ?", slug);
  if (!event || event.admin_token !== adminToken) return false;
  run("DELETE FROM events WHERE id = ?", event.id);
  return true;
}
