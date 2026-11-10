// Login, logout, quem sou eu e troca de senha do painel.
import {
  bad, checkPassword, clearCookie, clearFailures, ConfigError, currentAdmin, db, hashPassword, json, loginLocked,
  normalizeEmail, passwordProblem, readJson, registerFailure, requireAdmin, sameOrigin, sameSecret, sessionCookie,
} from "../lib/common.mjs";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(req) {
  if (!sameOrigin(req)) return bad("Origem não autorizada.", 403);
  const body = await readJson(req);
  const email = normalizeEmail(body?.email), password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || password.length > 200) return bad("Informe e-mail e senha.");
  if (await loginLocked(email)) return bad("Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429);

  let owner = false, valid = false;
  const ownerEmail = normalizeEmail(process.env.ADMIN_EMAIL || ""), ownerPassword = process.env.ADMIN_PASSWORD || "";
  if (ownerEmail && ownerPassword && email === ownerEmail) {
    valid = sameSecret(password, ownerPassword); owner = valid;
  } else {
    const user = await db("sairo-users").get(email, { type: "json" });
    valid = user ? await checkPassword(password, user) : false;
  }
  if (!valid) {
    await registerFailure(email); await wait(700);
    return bad("E-mail ou senha incorretos.", 401);
  }
  await clearFailures(email);
  return json({ ok: true, email, owner }, 200, { "Set-Cookie": sessionCookie(req, email, owner) });
}

export default async (req) => {
  const path = new URL(req.url).pathname.replace(/\/$/, "");
  try {
    if (path === "/api/admin/login" && req.method === "POST") return await login(req);
    if (path === "/api/admin/logout" && req.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": clearCookie(req) });
    if (path === "/api/admin/me" && req.method === "GET") {
      const admin = await currentAdmin(req);
      return admin ? json({ email: admin.email, name: admin.name, owner: admin.owner }) : bad("Não autenticado.", 401);
    }
    if (path === "/api/admin/password" && req.method === "POST") {
      const { admin, error } = await requireAdmin(req, { write: true });
      if (error) return error;
      if (admin.owner) return bad("A senha do responsável principal é trocada na Netlify (variável ADMIN_PASSWORD).", 400);
      const body = await readJson(req);
      const user = await db("sairo-users").get(admin.email, { type: "json" });
      if (!user || typeof body?.current !== "string" || !(await checkPassword(body.current, user))) return bad("A senha atual está incorreta.", 400);
      const problem = passwordProblem(body.next); if (problem) return bad(problem);
      await db("sairo-users").setJSON(admin.email, { ...user, ...(await hashPassword(body.next)) });
      return json({ ok: true });
    }
    return bad("Não encontrado.", 404);
  } catch (error) {
    if (error instanceof ConfigError) return bad(error.message, 500);
    return bad("Não foi possível concluir agora.", 503);
  }
};

export const config = { path: ["/api/admin/login", "/api/admin/logout", "/api/admin/me", "/api/admin/password"] };
