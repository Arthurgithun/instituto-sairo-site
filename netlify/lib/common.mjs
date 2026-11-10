// Funções compartilhadas pelo backend do site da Sairó (Netlify Functions + Netlify Blobs).
import { getStore } from "@netlify/blobs";
import { createHash, createHmac, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

export const db = (name) => getStore({ name, consistency: "strong" });

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
export const bad = (message, status = 400) => json({ error: message }, status);

export async function readJson(req) {
  try { const body = await req.json(); return body && typeof body === "object" && !Array.isArray(body) ? body : null; } catch { return null; }
}

// Aceita escritas só quando o navegador diz que veio do próprio site (o endereço de origem
// precisa ser o mesmo endereço pelo qual a requisição chegou, inclusive com domínio próprio).
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const allowed = [new URL(req.url).host, req.headers.get("host"), req.headers.get("x-forwarded-host")].filter(Boolean);
    return allowed.includes(host);
  } catch { return false; }
}

export const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
export const normalizeEmail = (value) => clean(value, 160).toLowerCase();
export const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// ---- identificadores ordenáveis por data (os mais novos ficam no fim da ordem alfabética) ----
export const newId = () => `${String(Date.now()).padStart(14, "0")}-${randomBytes(3).toString("hex")}`;
export const idTime = (id) => parseInt(String(id).slice(0, 14), 10) || 0;
export const validId = (id) => typeof id === "string" && /^\d{14}-[a-f0-9]{6}$/.test(id);

// ---- coleções (projetos, eventos, fotos): um registro por chave ----
export async function listCollection(name) {
  const store = db("sairo-content");
  const { blobs } = await store.list({ prefix: `${name}/` });
  const rows = await Promise.all(blobs.map(async (blob) => {
    const value = await store.get(blob.key, { type: "json" });
    return value ? { id: blob.key.slice(name.length + 1), ...value } : null;
  }));
  return rows.filter(Boolean).sort((a, b) => (a.id < b.id ? 1 : -1));
}
export async function getSettings() {
  return (await db("sairo-content").get("settings", { type: "json" })) || {};
}

// ---- senhas ----
const ITERATIONS = 210000;
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await pbkdf2Async(password, salt, ITERATIONS, 32, "sha256")).toString("hex");
  return { salt, hash };
}
export async function checkPassword(password, { salt, hash }) {
  const test = await pbkdf2Async(password, salt, ITERATIONS, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return test.length === expected.length && timingSafeEqual(test, expected);
}
export function sameSecret(a, b) {
  const x = createHash("sha256").update(String(a)).digest();
  const y = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(x, y);
}
export const passwordProblem = (password) =>
  typeof password !== "string" || password.length < 10 ? "A senha precisa ter pelo menos 10 caracteres." : password.length > 200 ? "Senha muito longa." : "";

// ---- sessão por cookie assinado ----
const COOKIE = "sairo_session";
const SESSION_SECONDS = 12 * 60 * 60;

export class ConfigError extends Error {}
function secret() {
  const value = process.env.SESSION_SECRET || "";
  if (value.length < 24) throw new ConfigError("O painel ainda não foi configurado: falta a variável SESSION_SECRET na Netlify.");
  return value;
}
const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function sessionCookie(req, email, owner) {
  const payload = Buffer.from(JSON.stringify({ e: email, o: owner ? 1 : 0, x: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}
export function clearCookie(req) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function readSession(req) {
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((part) => part.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, signature] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data && data.x > Date.now() / 1000 && typeof data.e === "string" ? data : null;
  } catch { return null; }
}

// Confere quem está logado e se a conta ainda existe.
export async function currentAdmin(req) {
  const session = readSession(req);
  if (!session) return null;
  const owner = normalizeEmail(process.env.ADMIN_EMAIL || "");
  if (session.o && owner && session.e === owner) return { email: owner, name: "Responsável", owner: true };
  const user = await db("sairo-users").get(session.e, { type: "json" });
  return user ? { email: session.e, name: user.name || session.e, owner: false } : null;
}

// Devolve { admin } ou { error: Response }.
export async function requireAdmin(req, { write = false, owner = false } = {}) {
  try {
    const admin = await currentAdmin(req);
    if (!admin) return { error: bad("Entre no painel para continuar.", 401) };
    if (owner && !admin.owner) return { error: bad("Só o responsável principal pode fazer isso.", 403) };
    if (write && !sameOrigin(req)) return { error: bad("Origem não autorizada.", 403) };
    return { admin };
  } catch (error) {
    if (error instanceof ConfigError) return { error: bad(error.message, 500) };
    return { error: bad("Não foi possível verificar o acesso agora.", 503) };
  }
}

// ---- limite de tentativas de login ----
const attemptKey = (email) => createHash("sha256").update(email).digest("hex").slice(0, 32);
export async function loginLocked(email) {
  const record = await db("sairo-auth").get(attemptKey(email), { type: "json" });
  return Boolean(record && record.until && record.until > Date.now());
}
export async function registerFailure(email) {
  const store = db("sairo-auth"), key = attemptKey(email);
  const record = (await store.get(key, { type: "json" })) || { count: 0 };
  const count = (record.until && record.until <= Date.now() ? 0 : record.count) + 1;
  await store.setJSON(key, count >= 5 ? { count: 0, until: Date.now() + 15 * 60 * 1000 } : { count });
}
export const clearFailures = (email) => db("sairo-auth").delete(attemptKey(email));

// ---- seções novas do site (números, parceiros, transparência, equipe, perguntas, depoimentos, novidades) ----
// [campo, tamanho máximo, obrigatório, tipo]   tipo "url" = precisa começar com https://
export const itemTables = {
  impact: { fields: [["value", 30, true], ["label", 120, true], ["note", 200]], image: false },
  partners: { fields: [["name", 120, true], ["link", 500, false, "url"]], image: true },
  documents: { fields: [["title", 160, true], ["year", 30], ["description", 400], ["link", 500, true, "url"]], image: false },
  team: { fields: [["name", 120, true], ["role", 120], ["bio", 600]], image: true },
  faqs: { fields: [["question", 200, true], ["answer", 2000, true]], image: false },
  testimonials: { fields: [["quote", 600, true], ["author", 120, true], ["role", 120]], image: false },
  news: { fields: [["title", 160, true], ["tag", 40], ["date", 60], ["body", 6000, true]], image: true },
};
// Ordem de exibição: campo "ordem" (menor primeiro) e, em empate, o cadastro mais antigo primeiro. Novidades: mais nova primeiro.
export const sortItems = (table, rows) => [...rows].sort((a, b) => {
  if (table === "news") return a.id < b.id ? 1 : -1;
  const d = (a.ordem || 0) - (b.ordem || 0);
  return d !== 0 ? d : a.id < b.id ? -1 : 1;
});
export const withImage = (row) => (row.objectKey ? { ...row, url: `/api/media/${row.objectKey}` } : row);
