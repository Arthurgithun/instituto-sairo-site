// /api/admin/volunteers – lista, marca como contatado e exclui cadastros de voluntários.
import { bad, db, json, readJson, requireAdmin, validId } from "../lib/common.mjs";

export default async (req) => {
  const { error } = await requireAdmin(req, { write: req.method !== "GET" });
  if (error) return error;
  const store = db("sairo-volunteers");
  try {
    if (req.method === "GET") {
      const { blobs } = await store.list();
      const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 1000);
      const rows = await Promise.all(keys.map(async (id) => {
        const v = await store.get(id, { type: "json" });
        return v ? { id, ...v, createdAt: new Date(parseInt(id.slice(0, 14), 10)).toISOString() } : null;
      }));
      return json({ volunteers: rows.filter(Boolean) });
    }
    const body = await readJson(req);
    if (!body || !validId(body.id)) return bad("Identificador inválido.");
    if (req.method === "PATCH") {
      if (typeof body.contacted !== "boolean") return bad("Dados inválidos.");
      const current = await store.get(body.id, { type: "json" });
      if (!current) return bad("Cadastro não encontrado.", 404);
      await store.setJSON(body.id, { ...current, contacted: body.contacted ? 1 : 0 });
      return json({ ok: true });
    }
    if (req.method === "DELETE") { await store.delete(body.id); return json({ ok: true }); }
    return bad("Método não permitido.", 405);
  } catch {
    return bad("Não foi possível concluir a operação agora.", 503);
  }
};

export const config = { path: "/api/admin/volunteers" };
