import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createEvent, getEvent, addResponse, updateResponse, deleteEvent } from "./events.js";

const app = new Hono();

// --- API ---

app.post("/api/events", async (c) => {
  const body = await c.req.json<{ title?: string; candidates?: string[] }>();
  const title = body.title?.trim();
  const candidates = body.candidates?.map((s) => s.trim()).filter(Boolean);

  if (!title || !candidates?.length) {
    return c.json({ error: "title and candidates are required" }, 400);
  }
  if (title.length > 200) return c.json({ error: "title too long" }, 400);
  if (candidates.length > 50) return c.json({ error: "too many candidates" }, 400);

  const result = createEvent(title, candidates);
  return c.json(result, 201);
});

app.get("/api/events/:slug", (c) => {
  const data = getEvent(c.req.param("slug"));
  if (!data) return c.json({ error: "not found" }, 404);
  return c.json(data);
});

app.post("/api/events/:slug/responses", async (c) => {
  const body = await c.req.json<{ name?: string; votes?: Record<number, string> }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name is required" }, 400);
  if (name.length > 50) return c.json({ error: "name too long" }, 400);

  const result = addResponse(c.req.param("slug"), name, body.votes || {});
  if (!result) return c.json({ error: "event not found" }, 404);
  return c.json(result, 201);
});

app.put("/api/events/:slug/responses/:id", async (c) => {
  const body = await c.req.json<{ name?: string; votes?: Record<number, string> }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name is required" }, 400);

  const ok = updateResponse(c.req.param("slug"), Number(c.req.param("id")), name, body.votes || {});
  if (!ok) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

app.delete("/api/events/:slug", (c) => {
  const admin = c.req.query("admin");
  if (!admin) return c.json({ error: "admin token required" }, 401);

  const ok = deleteEvent(c.req.param("slug"), admin);
  if (!ok) return c.json({ error: "not found or unauthorized" }, 403);
  return c.json({ ok: true });
});

// --- Static + SPA fallback ---

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ root: "./dist", path: "index.html" }));

// --- Start ---

const port = Number(process.env.PORT) || 3000;
console.log(`Sched running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
