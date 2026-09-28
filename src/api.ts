export interface Torrent {
  hash: string;
  name: string;
  size: number;
  total_size: number;
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
  tags: string;
  ratio: number;
  added_on: number;
  completion_on: number;
  last_activity: number;
  save_path: string;
  content_path: string;
  download_path: string;
  downloaded: number;
  uploaded: number;
  downloaded_session: number;
  uploaded_session: number;
  amount_left: number;
  completed: number;
  tracker: string;
  trackers_count: number;
  magnet_uri: string;
  priority: number;
  force_start: boolean;
  seq_dl: boolean;
  f_l_piece_prio: boolean;
  super_seeding: boolean;
  auto_tmm: boolean;
  dl_limit: number;
  up_limit: number;
  ratio_limit: number;
  seeding_time_limit: number;
  inactive_seeding_time_limit: number;
  max_ratio: number;
  seeding_time: number;
  time_active: number;
  availability: number;
  private?: boolean;
  comment?: string;
  popularity?: number;
}

export interface ServerState {
  dl_info_speed: number;
  up_info_speed: number;
  dl_info_data: number;
  up_info_data: number;
  dl_rate_limit: number;
  up_rate_limit: number;
  alltime_dl: number;
  alltime_ul: number;
  global_ratio: string;
  free_space_on_disk: number;
  connection_status: "connected" | "firewalled" | "disconnected";
  dht_nodes: number;
  total_peer_connections: number;
  queueing: boolean;
  use_alt_speed_limits: boolean;
  refresh_interval: number;
  total_wasted_session: number;
  total_buffers_size: number;
  average_time_queue: number;
  queued_io_jobs: number;
  read_cache_hits: string;
  read_cache_overload: string;
  write_cache_overload: string;
  last_external_address_v4?: string;
  last_external_address_v6?: string;
}

export interface Category {
  name: string;
  savePath: string;
}

export interface SyncData {
  rid?: number;
  full_update?: boolean;
  torrents?: Record<string, Partial<Torrent>>;
  torrents_removed?: string[];
  server_state?: Partial<ServerState>;
  categories?: Record<string, Partial<Category>>;
  categories_removed?: string[];
  tags?: string[];
  tags_removed?: string[];
  trackers?: Record<string, string[]>;
  trackers_removed?: string[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const API = "/api/v2";

type Params = Record<string, string | number | boolean | undefined | null>;

function encode(params?: Params): URLSearchParams {
  const body = new URLSearchParams();
  if (!params) return body;
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }
  return body;
}

async function raw(path: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(`${API}${path}`, { credentials: "same-origin", ...init });
  if (r.status === 403 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event("qbt:unauthorized"));
  }
  return r;
}

async function check(r: Response, what: string): Promise<Response> {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new ApiError(r.status, text.trim() || `${what}：HTTP ${r.status}`);
  }
  return r;
}

async function get<T>(path: string, params?: Params): Promise<T> {
  const qs = encode(params).toString();
  const r = await check(await raw(qs ? `${path}?${qs}` : path), path);
  const text = await r.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function getText(path: string, params?: Params): Promise<string> {
  const qs = encode(params).toString();
  const r = await check(await raw(qs ? `${path}?${qs}` : path), path);
  return r.text();
}

async function post(path: string, params?: Params | FormData): Promise<string> {
  const body = params instanceof FormData ? params : encode(params);
  const r = await check(await raw(path, { method: "POST", body }), path);
  return r.text();
}

async function postJson<T>(path: string, params?: Params): Promise<T> {
  const text = await post(path, params);
  return (text ? JSON.parse(text) : undefined) as T;
}

const joinHashes = (h: string[]) => h.join("|");

/* ---------- auth / app ---------- */

export async function login(username: string, password: string): Promise<boolean> {
  const r = await raw("/auth/login", { method: "POST", body: encode({ username, password }) });
  if (r.status === 204) return true;
  const text = await r.text().catch(() => "");
  return r.ok && text.trim() === "Ok.";
}

export const logout = () => post("/auth/logout");

export async function checkAuth(): Promise<boolean> {
  const r = await raw("/app/version");
  return r.ok;
}

export const appVersion = () => getText("/app/version");
export const webapiVersion = () => getText("/app/webapiVersion");
export const buildInfo = () => get<Record<string, string | number>>("/app/buildInfo");
export const shutdown = () => post("/app/shutdown");
export const defaultSavePath = () => getText("/app/defaultSavePath");

export type Preferences = Record<string, unknown>;
export const getPreferences = () => get<Preferences>("/app/preferences");
export const setPreferences = (prefs: Preferences) =>
  post("/app/setPreferences", { json: JSON.stringify(prefs) });

/* ---------- sync ---------- */

export const syncMainData = (rid: number) => get<SyncData>("/sync/maindata", { rid });

export interface Peer {
  ip: string;
  port: number;
  client: string;
  peer_id_client?: string;
  connection: string;
  country?: string;
  country_code?: string;
  flags: string;
  flags_desc: string;
  progress: number;
  dl_speed: number;
  up_speed: number;
  downloaded: number;
  uploaded: number;
  relevance: number;
  files: string;
}

export interface PeersSync {
  rid: number;
  full_update?: boolean;
  peers?: Record<string, Partial<Peer>>;
  peers_removed?: string[];
  show_flags?: boolean;
}

export const syncPeers = (hash: string, rid: number) =>
  get<PeersSync>("/sync/torrentPeers", { hash, rid });

/* ---------- transfer ---------- */

export const toggleAltSpeed = () => post("/transfer/toggleSpeedLimitsMode");
export const setGlobalDlLimit = (limit: number) => post("/transfer/setDownloadLimit", { limit });
export const setGlobalUpLimit = (limit: number) => post("/transfer/setUploadLimit", { limit });
export const banPeers = (peers: string[]) => post("/transfer/banPeers", { peers: peers.join("|") });

/* ---------- torrents ---------- */

async function startStop(h: string[], start: boolean) {
  try {
    await post(`/torrents/${start ? "start" : "stop"}`, { hashes: joinHashes(h) });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await post(`/torrents/${start ? "resume" : "pause"}`, { hashes: joinHashes(h) });
    } else throw e;
  }
}

export const start = (h: string[]) => startStop(h, true);
export const stop = (h: string[]) => startStop(h, false);
export const del = (h: string[], deleteFiles: boolean) =>
  post("/torrents/delete", { hashes: joinHashes(h), deleteFiles });
export const recheck = (h: string[]) => post("/torrents/recheck", { hashes: joinHashes(h) });
export const reannounce = (h: string[]) => post("/torrents/reannounce", { hashes: joinHashes(h) });
export const setForceStart = (h: string[], value: boolean) =>
  post("/torrents/setForceStart", { hashes: joinHashes(h), value });
export const setSuperSeeding = (h: string[], value: boolean) =>
  post("/torrents/setSuperSeeding", { hashes: joinHashes(h), value });
export const setAutoTMM = (h: string[], enable: boolean) =>
  post("/torrents/setAutoManagement", { hashes: joinHashes(h), enable });
export const toggleSequential = (h: string[]) =>
  post("/torrents/toggleSequentialDownload", { hashes: joinHashes(h) });
export const toggleFirstLast = (h: string[]) =>
  post("/torrents/toggleFirstLastPiecePrio", { hashes: joinHashes(h) });

export type QueueMove = "topPrio" | "increasePrio" | "decreasePrio" | "bottomPrio";
export const queueMove = (h: string[], move: QueueMove) =>
  post(`/torrents/${move}`, { hashes: joinHashes(h) });

export const setLocation = (h: string[], location: string) =>
  post("/torrents/setLocation", { hashes: joinHashes(h), location });
export const setDownloadPath = (h: string[], path: string) =>
  post("/torrents/setDownloadPath", { id: joinHashes(h), path });
export const rename = (hash: string, name: string) => post("/torrents/rename", { hash, name });
export const setCategory = (h: string[], category: string) =>
  post("/torrents/setCategory", { hashes: joinHashes(h), category });
export const addTags = (h: string[], tags: string[]) =>
  post("/torrents/addTags", { hashes: joinHashes(h), tags: tags.join(",") });
export const removeTags = (h: string[], tags: string[]) =>
  post("/torrents/removeTags", { hashes: joinHashes(h), tags: tags.join(",") });
export const setDownloadLimit = (h: string[], limit: number) =>
  post("/torrents/setDownloadLimit", { hashes: joinHashes(h), limit });
export const setUploadLimit = (h: string[], limit: number) =>
  post("/torrents/setUploadLimit", { hashes: joinHashes(h), limit });
export const setShareLimits = (
  h: string[],
  ratioLimit: number,
  seedingTimeLimit: number,
  inactiveSeedingTimeLimit: number,
) =>
  post("/torrents/setShareLimits", {
    hashes: joinHashes(h),
    ratioLimit,
    seedingTimeLimit,
    inactiveSeedingTimeLimit,
  });

export const createCategory = (category: string, savePath: string) =>
  post("/torrents/createCategory", { category, savePath });
export const editCategory = (category: string, savePath: string) =>
  post("/torrents/editCategory", { category, savePath });
export const removeCategories = (names: string[]) =>
  post("/torrents/removeCategories", { categories: names.join("\n") });
export const createTags = (tags: string[]) => post("/torrents/createTags", { tags: tags.join(",") });
export const deleteTags = (tags: string[]) => post("/torrents/deleteTags", { tags: tags.join(",") });

export interface AddOptions {
  savepath?: string;
  downloadPath?: string;
  useDownloadPath?: boolean;
  category?: string;
  tags?: string;
  rename?: string;
  stopped?: boolean;
  skip_checking?: boolean;
  sequentialDownload?: boolean;
  firstLastPiecePrio?: boolean;
  autoTMM?: boolean;
  contentLayout?: "Original" | "Subfolder" | "NoSubfolder";
  stopCondition?: "None" | "MetadataReceived" | "FilesChecked";
  addToTopOfQueue?: boolean;
  dlLimit?: number;
  upLimit?: number;
  ratioLimit?: number;
  seedingTimeLimit?: number;
}

export async function addTorrents(urls: string, files: File[], opts: AddOptions): Promise<void> {
  const fd = new FormData();
  if (urls.trim()) fd.append("urls", urls.trim());
  for (const f of files) fd.append("torrents", f, f.name);
  for (const [k, v] of Object.entries(opts)) {
    if (v === undefined || v === "") continue;
    fd.append(k, String(v));
  }
  if (opts.stopped !== undefined) fd.append("paused", String(opts.stopped));
  const text = await post("/torrents/add", fd);
  if (text.trim() === "Fails.") throw new ApiError(415, "种子无效或已存在");
}

export interface TorrentProps {
  save_path: string;
  download_path?: string;
  creation_date: number;
  piece_size: number;
  comment: string;
  total_wasted: number;
  total_uploaded: number;
  total_uploaded_session: number;
  total_downloaded: number;
  total_downloaded_session: number;
  up_limit: number;
  dl_limit: number;
  time_elapsed: number;
  seeding_time: number;
  nb_connections: number;
  nb_connections_limit: number;
  share_ratio: number;
  addition_date: number;
  completion_date: number;
  created_by: string;
  dl_speed_avg: number;
  dl_speed: number;
  eta: number;
  last_seen: number;
  peers: number;
  peers_total: number;
  pieces_have: number;
  pieces_num: number;
  reannounce: number;
  seeds: number;
  seeds_total: number;
  total_size: number;
  up_speed_avg: number;
  up_speed: number;
  isPrivate?: boolean;
  is_private?: boolean;
  hash?: string;
  infohash_v1?: string;
  infohash_v2?: string;
  popularity?: number;
}

export const getProps = (hash: string) => get<TorrentProps>("/torrents/properties", { hash });

export interface Tracker {
  url: string;
  status: number;
  tier: number | string;
  num_peers: number;
  num_seeds: number;
  num_leeches: number;
  num_downloaded: number;
  msg: string;
}

export const getTrackers = (hash: string) => get<Tracker[]>("/torrents/trackers", { hash });
export const addTrackers = (hash: string, urls: string[]) =>
  post("/torrents/addTrackers", { hash, urls: urls.join("\n") });
export const editTracker = (hash: string, origUrl: string, newUrl: string) =>
  post("/torrents/editTracker", { hash, origUrl, newUrl });
export const removeTrackers = (hash: string, urls: string[]) =>
  post("/torrents/removeTrackers", { hash, urls: urls.join("|") });
export const addPeers = (hashes: string[], peers: string[]) =>
  post("/torrents/addPeers", { hashes: joinHashes(hashes), peers: peers.join("|") });

export interface WebSeed {
  url: string;
}

export const getWebSeeds = (hash: string) => get<WebSeed[]>("/torrents/webseeds", { hash });
export const addWebSeeds = (hash: string, urls: string[]) =>
  post("/torrents/addWebSeeds", { hash, urls: urls.join("|") });
export const removeWebSeeds = (hash: string, urls: string[]) =>
  post("/torrents/removeWebSeeds", { hash, urls: urls.join("|") });

export interface TorrentFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  priority: number;
  availability: number;
  is_seed?: boolean;
  piece_range?: [number, number];
}

export const getFiles = (hash: string) => get<TorrentFile[]>("/torrents/files", { hash });
export const setFilePrio = (hash: string, ids: number[], priority: number) =>
  post("/torrents/filePrio", { hash, id: ids.join("|"), priority });
export const renameFile = (hash: string, oldPath: string, newPath: string) =>
  post("/torrents/renameFile", { hash, oldPath, newPath });
export const renameFolder = (hash: string, oldPath: string, newPath: string) =>
  post("/torrents/renameFolder", { hash, oldPath, newPath });

export const getPieceStates = (hash: string) => get<number[]>("/torrents/pieceStates", { hash });

export const exportUrl = (hash: string) => `${API}/torrents/export?hash=${hash}`;

/* ---------- log ---------- */

export interface LogEntry {
  id: number;
  message: string;
  timestamp: number;
  type: number;
}

export interface PeerLogEntry {
  id: number;
  ip: string;
  timestamp: number;
  blocked: boolean;
  reason: string;
}

export const getLog = (lastKnownId: number) =>
  get<LogEntry[]>("/log/main", {
    normal: true,
    info: true,
    warning: true,
    critical: true,
    last_known_id: lastKnownId,
  });
export const getPeerLog = (lastKnownId: number) =>
  get<PeerLogEntry[]>("/log/peers", { last_known_id: lastKnownId });

/* ---------- search ---------- */

export interface SearchPlugin {
  name: string;
  fullName: string;
  enabled: boolean;
  version: string;
  url: string;
  supportedCategories: { id: string; name: string }[];
}

export interface SearchResult {
  descrLink: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  nbLeechers: number;
  nbSeeders: number;
  siteUrl: string;
  engineName?: string;
  pubDate?: number;
}

export interface SearchResults {
  results: SearchResult[];
  status: "Running" | "Stopped";
  total: number;
}

export const searchPlugins = () => get<SearchPlugin[]>("/search/plugins");
export const searchStart = (pattern: string, plugins: string, category: string) =>
  postJson<{ id: number }>("/search/start", { pattern, plugins, category });
export const searchStop = (id: number) => post("/search/stop", { id });
export const searchDelete = (id: number) => post("/search/delete", { id });
export const searchResults = (id: number, offset: number) =>
  postJson<SearchResults>("/search/results", { id, offset, limit: 500 });
export const installPlugin = (sources: string[]) =>
  post("/search/installPlugin", { sources: sources.join("|") });
export const uninstallPlugin = (names: string[]) =>
  post("/search/uninstallPlugin", { names: names.join("|") });
export const enablePlugin = (names: string[], enable: boolean) =>
  post("/search/enablePlugin", { names: names.join("|"), enable });
export const updatePlugins = () => post("/search/updatePlugins");

/* ---------- rss ---------- */

export interface RssArticle {
  id: string;
  title: string;
  date: string;
  description?: string;
  link?: string;
  torrentURL?: string;
  isRead?: boolean;
  author?: string;
  category?: string;
}

export interface RssFeed {
  uid: string;
  url: string;
  title?: string;
  lastBuildDate?: string;
  isLoading?: boolean;
  hasError?: boolean;
  articles?: RssArticle[];
}

export type RssNode = { [name: string]: RssFeed | RssNode };

export const rssItems = () => get<RssNode>("/rss/items", { withData: true });
export const rssAddFolder = (path: string) => post("/rss/addFolder", { path });
export const rssAddFeed = (url: string, path: string) => post("/rss/addFeed", { url, path });
export const rssRemove = (path: string) => post("/rss/removeItem", { path });
export const rssMove = (itemPath: string, destPath: string) =>
  post("/rss/moveItem", { itemPath, destPath });
export const rssRefresh = (itemPath: string) => post("/rss/refreshItem", { itemPath });
export const rssMarkRead = (itemPath: string, articleId?: string) =>
  post("/rss/markAsRead", { itemPath, articleId });

export interface RssRule {
  enabled: boolean;
  mustContain: string;
  mustNotContain: string;
  useRegex: boolean;
  episodeFilter: string;
  smartFilter: boolean;
  previouslyMatchedEpisodes: string[];
  affectedFeeds: string[];
  ignoreDays: number;
  lastMatch: string;
  addPaused?: boolean | null;
  assignedCategory: string;
  savePath: string;
  torrentParams?: Record<string, unknown>;
}

export const rssRules = () => get<Record<string, RssRule>>("/rss/rules");
export const rssSetRule = (ruleName: string, rule: Partial<RssRule>) =>
  post("/rss/setRule", { ruleName, ruleDef: JSON.stringify(rule) });
export const rssRenameRule = (ruleName: string, newRuleName: string) =>
  post("/rss/renameRule", { ruleName, newRuleName });
export const rssRemoveRule = (ruleName: string) => post("/rss/removeRule", { ruleName });
export const rssMatching = (ruleName: string) =>
  get<Record<string, string[]>>("/rss/matchingArticles", { ruleName });
