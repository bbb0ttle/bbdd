export interface Torrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  state: string;
  num_seeds: number;
  num_complete: number;
  num_leechs: number;
  num_incomplete: number;
  category: string;
  ratio: number;
  added_on: number;
  save_path: string;
}

export interface ServerState {
  dl_info_speed: number;
  up_info_speed: number;
  dl_info_data: number;
  up_info_data: number;
  free_space_on_disk: number;
  connection_status: string;
}

export interface SyncData {
  rid?: number;
  full_update?: boolean;
  torrents?: Record<string, Partial<Torrent>>;
  torrents_removed?: string[];
  server_state?: Partial<ServerState>;
  categories?: Record<string, { name: string; savePath: string }>;
}

const API = "/api/v2";

async function req(path: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(`${API}${path}`, { credentials: "same-origin", ...init });
  return r;
}

export async function login(username: string, password: string): Promise<boolean> {
  const body = new URLSearchParams({ username, password });
  const r = await req("/auth/login", { method: "POST", body });
  const text = await r.text();
  return r.ok && text.trim() === "Ok.";
}

export async function logout(): Promise<void> {
  await req("/auth/logout", { method: "POST" });
}

export async function checkAuth(): Promise<boolean> {
  const r = await req("/app/version");
  return r.ok;
}

export async function syncMainData(rid: number): Promise<SyncData> {
  const r = await req(`/sync/maindata?rid=${rid}`);
  if (!r.ok) throw new Error(`sync ${r.status}`);
  return r.json();
}

async function torrentAction(action: string, hashes: string[], extra?: Record<string, string>) {
  const body = new URLSearchParams({ hashes: hashes.join("|"), ...extra });
  return req(`/torrents/${action}`, { method: "POST", body });
}

async function startStop(h: string[], start: boolean) {
  const primary = start ? "start" : "stop";
  const legacy = start ? "resume" : "pause";
  const r = await torrentAction(primary, h);
  if (r.status === 404) await torrentAction(legacy, h);
}

export const pause = (h: string[]) => startStop(h, false);
export const resume = (h: string[]) => startStop(h, true);
export const del = (h: string[], deleteFiles: boolean) =>
  torrentAction("delete", h, { deleteFiles: String(deleteFiles) });

export async function addTorrent(urls: string, category?: string): Promise<boolean> {
  const body = new URLSearchParams({ urls });
  if (category) body.set("category", category);
  const r = await req("/torrents/add", { method: "POST", body });
  return r.ok;
}

export async function setSpeedLimit(_mode: "download" | "upload", _limit: number): Promise<void> {
  // kept for future use
}
