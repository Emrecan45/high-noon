import { getClient, netAvailable } from "./net.js";
import { cgDataGet, cgDataSet, getCgUser, isCrazyGames } from "./sdk.js";

let profile = null;
let owned = new Set();
let ensurePromise = null;

export function localPseudo() {
  let stored = localStorage.getItem("hn-pseudo");
  if (stored === null || stored === "") {
    stored = "Player" + String(Math.floor(Math.random() * 9000) + 1000);
    localStorage.setItem("hn-pseudo", stored);
  }
  return stored;
}

function sanitizePseudo(raw) {
  let clean = "";
  for (const ch of String(raw)) {
    if (/[A-Za-z0-9_ .-]/.test(ch)) {
      clean += ch;
    }
  }
  clean = clean.trim().slice(0, 16).trim();
  return clean;
}

function backupSession(session) {
  if (session === null) {
    return;
  }
  cgDataSet("hn-session", JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  }));
}

async function restoreFromCg(supabase) {
  const raw = cgDataGet("hn-session");
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const tokens = JSON.parse(raw);
    const { data, error } = await supabase.auth.setSession(tokens);
    if (error !== null) {
      return null;
    }
    return data.session;
  } catch (err) {
    return null;
  }
}

export async function initAccount() {
  if (!netAvailable()) {
    return null;
  }
  const supabase = getClient();
  supabase.auth.onAuthStateChange(function (event, session) {
    backupSession(session);
  });
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
    if (session === null) {
      session = await restoreFromCg(supabase);
    }
  } catch (err) {
    return null;
  }
  if (session === null) {
    return null;
  }
  await fetchProfile();
  await syncCgLink();
  return profile;
}

export function getProfile() {
  return profile;
}

export function ownedSkins() {
  return owned;
}

async function fetchProfile() {
  const supabase = getClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData === null || userData.user === null) {
    return;
  }
  const uid = userData.user.id;
  const { data: rows } = await supabase.from("profiles").select("*").eq("id", uid);
  if (rows === null || rows.length === 0) {
    return;
  }
  profile = rows[0];
  const { data: skinRows } = await supabase.from("profile_skins").select("skin_id").eq("profile_id", uid);
  owned = new Set();
  if (skinRows !== null) {
    for (const row of skinRows) {
      owned.add(row.skin_id);
    }
  }
}

async function syncCgLink() {
  if (profile === null || !isCrazyGames()) {
    return;
  }
  const cgUser = await getCgUser();
  if (cgUser === null) {
    return;
  }
  if (profile.cg_username !== cgUser.username) {
    const supabase = getClient();
    await supabase.rpc("set_cg_username", { p_cg: cgUser.username });
    profile.cg_username = cgUser.username;
  }
}

function mapProfileError(error) {
  if (error.message.indexOf("duplicate key") !== -1 || error.code === "23505") {
    return "taken";
  }
  if (error.message.indexOf("pseudo_format") !== -1 || error.code === "23514") {
    return "invalid";
  }
  return "network";
}

export async function createProfile(pseudo) {
  const supabase = getClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session === null) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error !== null) {
      return { ok: false, reason: "network" };
    }
    backupSession(data.session);
  }
  let cg = null;
  const cgUser = await getCgUser();
  if (cgUser !== null) {
    cg = cgUser.username;
  }
  const { data, error } = await supabase.rpc("create_profile", { p_pseudo: pseudo, p_cg: cg });
  if (error !== null) {
    return { ok: false, reason: mapProfileError(error) };
  }
  profile = data;
  owned = new Set(["drifter"]);
  return { ok: true };
}

async function createWithRetries() {
  let base = null;
  const cgUser = await getCgUser();
  if (cgUser !== null) {
    base = sanitizePseudo(cgUser.username);
  }
  if (base === null || base.length < 3) {
    base = localPseudo();
  }
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const result = await createProfile(candidate);
    if (result.ok) {
      localStorage.setItem("hn-pseudo", profile.pseudo);
      return profile;
    }
    if (result.reason === "network") {
      return null;
    }
    const digits = String(Math.floor(Math.random() * 9000) + 1000);
    candidate = base.slice(0, 12) + digits;
  }
  return null;
}

export async function ensureAccount() {
  if (profile !== null) {
    return profile;
  }
  if (!netAvailable()) {
    return null;
  }
  if (ensurePromise === null) {
    ensurePromise = createWithRetries().finally(function () {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}

export async function renamePseudo(pseudo) {
  const supabase = getClient();
  const { error } = await supabase.rpc("set_pseudo", { p_pseudo: pseudo });
  if (error !== null) {
    return { ok: false, reason: mapProfileError(error) };
  }
  profile.pseudo = pseudo;
  localStorage.setItem("hn-pseudo", pseudo);
  return { ok: true };
}

export async function buySkin(skinId) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("buy_skin", { p_skin: skinId });
  if (error !== null) {
    return false;
  }
  profile.coins = data.coins;
  owned.add(skinId);
  return true;
}

export async function equipSkin(skinId) {
  const supabase = getClient();
  const { error } = await supabase.rpc("equip_skin", { p_skin: skinId });
  if (error !== null) {
    return false;
  }
  profile.skin = skinId;
  return true;
}

export async function reportResult(won, ranked, oppElo, oppId) {
  if (profile === null) {
    return null;
  }
  const supabase = getClient();
  const { data, error } = await supabase.rpc("report_result", {
    p_won: won,
    p_ranked: ranked,
    p_opp_elo: oppElo,
    p_opp_id: oppId
  });
  if (error !== null) {
    return null;
  }
  profile.elo = data.elo;
  profile.coins = data.coins;
  return data;
}

export async function recordStats(stats, won) {
  if (profile === null) {
    return;
  }
  const supabase = getClient();
  const { error } = await supabase.rpc("record_stats", {
    p_shots: stats.shots,
    p_hits: stats.hits,
    p_heads: stats.heads,
    p_won: won
  });
  if (error !== null) {
    return;
  }
  if (Number.isFinite(profile.shots_fired)) {
    profile.shots_fired += stats.shots;
    profile.shots_hit += stats.hits;
    profile.headshots += stats.heads;
    if (won) {
      profile.win_streak += 1;
    } else {
      profile.win_streak = 0;
    }
    if (profile.win_streak > profile.best_streak) {
      profile.best_streak = profile.win_streak;
    }
  }
}

export async function claimAdReward() {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("reward_ad");
  if (error !== null) {
    return null;
  }
  profile.coins = data.coins;
  return data;
}

export async function fetchLeaderboard() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("pseudo, elo, skin, ranked_wins, ranked_losses")
    .or("ranked_wins.gt.0,ranked_losses.gt.0")
    .order("elo", { ascending: false })
    .limit(20);
  if (error !== null) {
    return null;
  }
  return data;
}
