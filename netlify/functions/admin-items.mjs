// /api/admin/items – seções novas do site: números, parceiros, transparência, equipe, perguntas, depoimentos e novidades.
// Também guarda a foto do relato da Festa (tabela "festaFoto").
import { bad, clean, db, itemTables, json, listCollection, newId, readJson, requireAdmin, sortItems, validId, withImage } from "../lib/common.mjs";
import { randomUUID } from "node:crypto";

const formats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 5 * 1024 * 1024; // a Netlify aceita até ~6 MB por envio

async function saveImage(file) {
  const objectKey = `${randomUUID()}.${formats[file.type]}`;
  await db("sairo-media").set(objectKey, await file.arrayBuffer(), { metadata: { contentType: file.type } });
  return objectKey;
}
const dropImage = (objectKey) => (objectKey ? db("sairo-media").delete(objectKey).catch(() => {}) : null);
const goodImage = (file) => file && typeof file !== "string" && formats[file.type] && file.size > 0 && file.size <= MAX_BYTES;

export default async (req) => {
  const write = req.method !== "GET";
  const { error } = await requireAdmin(req, { write });
  if (error) return error;
  const store = db("sairo-content");
  try {
    if (req.method === "GET") {
      const out = {};
      await Promise.all(Object.keys(itemTables).map(async (table) => { out[table] = sortItems(table, await listCollection(table)).slice(0, 300).map(withImage); }));
      out.festaFoto = withImage((await store.get("festa-foto", { type: "json" })) || {});
      return json(out);
    }

    if (req.method === "POST") {
      let form;
      try { form = await req.formData(); } catch { return bad("Envio inválido."); }
      const table = String(form.get("table") || "");
      const image = form.get("image");
      const hasImage = image && typeof image !== "string" && image.size > 0;
      if (hasImage && !goodImage(image)) return bad("Envie uma imagem JPG, PNG, WebP ou GIF de até 5 MB.");

      if (table === "festaFoto") {
        const current = (await store.get("festa-foto", { type: "json" })) || {};
        if (form.get("remove") === "1") { await dropImage(current.objectKey); await store.delete("festa-foto"); return json({ ok: true }); }
        if (!hasImage) return bad("Escolha uma foto.");
        const objectKey = await saveImage(image);
        await store.setJSON("festa-foto", { objectKey, alt: clean(form.get("alt"), 280) || "Foto da Festa na Rua das Crianças" });
        await dropImage(current.objectKey);
        return json({ ok: true });
      }

      const config = itemTables[table];
      if (!config) return bad("Seção não permitida.");
      const record = { published: form.get("published") === "0" ? 0 : 1 };
      const ordem = parseInt(String(form.get("ordem") || "0"), 10);
      record.ordem = Number.isFinite(ordem) ? Math.min(Math.max(ordem, 0), 999) : 0;
      for (const [key, max, required, kind] of config.fields) {
        const value = clean(form.get(key), max);
        if (required && !value) return bad("Preencha os campos obrigatórios.");
        if (kind === "url" && value && !/^https:\/\//i.test(value)) return bad("Os links devem começar com https://.");
        record[key] = value;
      }
      const id = form.get("id");
      let previous = null;
      if (id) {
        if (!validId(id)) return bad("Identificador inválido.");
        previous = await store.get(`${table}/${id}`, { type: "json" });
        if (!previous) return bad("Registro não encontrado.", 404);
      }
      if (config.image) {
        record.objectKey = previous?.objectKey || "";
        if (hasImage) { record.objectKey = await saveImage(image); }
        else if (form.get("removeImage") === "1") record.objectKey = "";
        if (config.image && record.objectKey) record.alt = clean(form.get("alt"), 280);
      }
      const finalId = id || newId();
      await store.setJSON(`${table}/${finalId}`, record);
      if (previous?.objectKey && previous.objectKey !== record.objectKey) await dropImage(previous.objectKey);
      return json({ ok: true, id: finalId });
    }

    if (req.method === "DELETE") {
      const body = await readJson(req);
      if (!body) return bad("JSON inválido.");
      if (body.table === "festaFoto") {
        const current = await store.get("festa-foto", { type: "json" });
        await dropImage(current?.objectKey); await store.delete("festa-foto");
        return json({ ok: true });
      }
      if (!itemTables[body.table] || !validId(body.id)) return bad("Pedido inválido.");
      const key = `${body.table}/${body.id}`;
      const current = await store.get(key, { type: "json" });
      await dropImage(current?.objectKey);
      await store.delete(key);
      return json({ ok: true });
    }
    return bad("Método não permitido.", 405);
  } catch {
    return bad("Não foi possível concluir a operação agora.", 503);
  }
};

export const config = { path: "/api/admin/items" };
