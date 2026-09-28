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
  tags?: string;
  completed?: number;
  downloaded?: number;
  uploaded?: number;
  tracker?: string;
  magnet_uri?: string;
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
  categories_removed?: string[];
  tags?: string[];
  tags_removed?: string[];
}

const API = "/api/v2";

async function req(path: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(`${API}${path}`, { credentials: "same-origin", ...init });
  return r;
}

export async function login(username: string, password: string): Promise<boolean> {
  const body = new URLSearchParams({ username, password });
  const r = await req("/auth/login", { method: "POST", body });
  // qbt ≥5.x 成功返回 204（空体）；旧版返回 200 "Ok."。失败为 403。
  if (r.ok) return true;
  const text = await r.text().catch(() => "");
  return text.trim() === "Ok.";
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

export async function addTorrentFile(file: File, category?: string): Promise<boolean> {
  const fd = new FormData();
  fd.append("torrents", file, file.name);
  if (category) fd.append("category", category);
  const r = await req("/torrents/add", { method: "POST", body: fd });
  return r.ok;
}

export const recheck = (h: string[]) => torrentAction("recheck", h);
export const reannounce = (h: string[]) => torrentAction("reannounce", h);
export const setCategory = (h: string[], category: string) =>
  torrentAction("setCategory", h, { category });
export const addTags = (h: string[], tags: string) =>
  torrentAction("addTags", h, { tags });
export const removeTags = (h: string[], tags: string) =>
  torrentAction("removeTags", h, { tags });

export interface Preferences {
  save_path?: string;
  dl_limit?: number;
  up_limit?: number;
  alt_dl_limit?: number;
  alt_up_limit?: number;
  use_alt_speed_limits?: boolean;
  max_active_downloads?: number;
  max_active_uploads?: number;
  max_active_torrents?: number;
  queueing_enabled?: boolean;
  [k: string]: unknown;
}

export async function getPreferences(): Promise<Preferences> {
  const r = await req("/app/preferences");
  return r.json();
}

export async function setPreferences(prefs: Record<string, unknown>): Promise<boolean> {
  const body = new URLSearchParams({ json: JSON.stringify(prefs) });
  const r = await req("/app/setPreferences", { method: "POST", body });
  return r.ok;
}

export interface TorrentFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  priority: number;
}

export async function getFiles(hash: string): Promise<TorrentFile[]> {
  const r = await req(`/torrents/files?hash=${hash}`);
  return r.json();
}

export interface TorrentProps {
  save_path?: string;
  download_path?: string;
  comment?: string;
  total_size?: number;
  downloaded?: number;
  uploaded?: number;
  dl_speed_avg?: number;
  up_speed_avg?: number;
  time_elapsed?: number;
  seeding_time?: number;
  seeds_total?: number;
  peers_total?: number;
  share_limit?: number;
  tracker?: string;
}

export async function getProps(hash: string): Promise<TorrentProps> {
  const r = await req(`/torrents/properties?hash=${hash}`);
  return r.json();
}
