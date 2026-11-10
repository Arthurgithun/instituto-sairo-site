// POST /api/admin/upload – envio de foto para a galeria.
import { bad, clean, db, json, newId, requireAdmin } from "../lib/common.mjs";
import { randomUUID } from "node:crypto";

const formats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 5 * 1024 * 1024; // a Netlify aceita até ~6 MB por envio

export default async (req) => {
  if (req.method !== "POST") return bad("Método não permitido.", 405);
  const { error } = await requireAdmin(req, { write: true });
  if (error) return error;
  let form;
  try { form = await req.formData(); } catch { return bad("Envio inválido."); }
  const image = form.get("image");
  if (!image || typeof image === "string" || !formats[image.type] || image.size === 0 || image.size > MAX_BYTES) {
    return bad("Envie uma imagem JPG, PNG, WebP ou GIF de até 5 MB.");
  }
  const caption = clean(form.get("caption"), 280);
  const alt = clean(form.get("alt"), 280) || "Foto das ações do Instituto Sairó";
  const objectKey = `${randomUUID()}.${formats[image.type]}`;
  try {
    await db("sairo-media").set(objectKey, await image.arrayBuffer(), { metadata: { contentType: image.type } });
    const id = newId();
    await db("sairo-content").setJSON(`photos/${id}`, { objectKey, caption, alt });
    return json({ ok: true, id, url: `/api/media/${objectKey}` });
  } catch {
    await db("sairo-media").delete(objectKey).catch(() => {});
    return bad("Falha ao enviar a imagem.", 503);
  }
};

export const config = { path: "/api/admin/upload" };
