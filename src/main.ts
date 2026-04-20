import { renderCreate } from "./create.js";
import { renderPoll } from "./poll.js";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;

export function esc(s: string): string {
  const el = document.createElement("span");
  el.textContent = s;
  return el.innerHTML;
}

export function navigate(path: string) {
  history.pushState(null, "", path);
  route();
}

function route() {
  const path = window.location.pathname;
  const match = path.match(/^\/p\/([a-z0-9]+)$/);
  if (match) {
    renderPoll(app, match[1]);
  } else {
    renderCreate(app);
  }
}

window.addEventListener("popstate", route);
route();
