// /api/admin/users – equipe com acesso ao painel (somente o responsável principal gerencia).
import { bad, clean, db, hashPassword, json, normalizeEmail, passwordProblem, readJson, requireAdmin, validEmail } from "../lib/common.mjs";

export default async (req) => {
  const { admin, error } = await requireAdmin(req, { write: req.method !== "GET", owner: true });
  if (error) return error;
  const store = db("sairo-users");
  const ownerEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
  try {
    if (req.method === "GET") {
      const { blobs } = await store.list();
      const users = await Promise.all(blobs.map(async (b) => {
        const u = await store.get(b.key, { type: "json" });
        return u ? { email: b.key, name: u.name || "", createdAt: u.createdAt || "" } : null;
      }));
      return json({ owner: { email: admin.email }, users: users.filter(Boolean).sort((a, b) => a.email.localeCompare(b.email)) });
    }
    const body = await readJson(req);
    if (!body) return bad("JSON inválido.");
    const email = normalizeEmail(body.email);
    if (!validEmail(email)) return bad("Informe um e-mail válido.");
    if (email === ownerEmail) return bad("Esse e-mail é o do responsável principal.");

    if (req.method === "POST") {
      const problem = passwordProblem(body.password); if (problem) return bad(problem);
      if (await store.get(email, { type: "json" })) return bad("Já existe uma conta com esse e-mail.");
      await store.setJSON(email, { name: clean(body.name, 120), createdAt: new Date().toISOString(), ...(await hashPassword(body.password)) });
      return json({ ok: true });
    }
    if (req.method === "PATCH") { // redefinir a senha de alguém
      const problem = passwordProblem(body.password); if (problem) return bad(problem);
      const user = await store.get(email, { type: "json" });
      if (!user) return bad("Conta não encontrada.", 404);
      await store.setJSON(email, { ...user, ...(await hashPassword(body.password)) });
      return json({ ok: true });
    }
    if (req.method === "DELETE") { await store.delete(email); return json({ ok: true }); }
    return bad("Método não permitido.", 405);
  } catch {
    return bad("Não foi possível concluir a operação agora.", 503);
  }
};

export const config = { path: "/api/admin/users" };
