export interface EventData {
  event: { title: string; slug: string; created_at: string };
  candidates: { id: number; label: string }[];
  responses: {
    id: number;
    name: string;
    created_at: string;
    votes: Record<number, string>;
  }[];
  summary: Record<number, { yes: number; maybe: number; no: number }>;
  bestId: number | null;
}

export async function createEvent(
  title: string,
  candidates: string[],
): Promise<{ slug: string; admin_token: string }> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, candidates }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function fetchEvent(slug: string): Promise<EventData | null> {
  const res = await fetch(`/api/events/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch event");
  return res.json();
}

export async function submitResponse(
  slug: string,
  name: string,
  votes: Record<number, string>,
): Promise<{ id: number }> {
  const res = await fetch(`/api/events/${slug}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, votes }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function editResponse(
  slug: string,
  responseId: number,
  name: string,
  votes: Record<number, string>,
): Promise<void> {
  const res = await fetch(`/api/events/${slug}/responses/${responseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, votes }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
}

export async function deleteEvent(slug: string, adminToken: string): Promise<void> {
  const res = await fetch(`/api/events/${slug}?admin=${adminToken}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
}
