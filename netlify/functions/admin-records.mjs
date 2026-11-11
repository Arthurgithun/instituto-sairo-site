// /api/admin/records – projetos, agenda, fotos e informações (leitura, gravação e exclusão).
import { bad, clean, db, getSettings, json, listCollection, newId, readJson, requireAdmin, validId, withImage } from "../lib/common.mjs";
import { randomUUID } from "node:crypto";

const settingKeys = ["email", "whatsapp", "instagram", "agenda", "pixNome", "pixCnpj", "pixChave", "linkCartao"];
const fields = {
  projects: [["title", 160], ["year", 500], ["description", 4000], ["tags", 120], ["color", 20]],
  events: [["title", 160], ["date", 500], ["location", 500], ["description", 4000], ["link", 500]],
};

// projetos podem ter imagem (logo ou foto) e uma cor da paleta da Sairó
const colors = ["", "verde", "azul", "vermelho", "laranja", "amarelo"];
const formats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 5 * 1024 * 1024; // a Netlify aceita até ~6 MB por envio
const isFile = (v) => v && typeof v !== "string" && v.size > 0;
async function saveImage(file) {
  const objectKey = `${randomUUID()}.${formats[file.type]}`;
  await db("sairo-media").set(objectKey, await file.arrayBuffer(), { metadata: { contentType: file.type } });
  return objectKey;
}
const dropImage = (objectKey) => (objectKey ? db("sairo-media").delete(objectKey).catch(() => {}) : null);

export default async (req) => {
  const write = req.method !== "GET";
  const { error } = await requireAdmin(req, { write });
  if (error) return error;
  try {
    if (req.method === "GET") {
      const [projects, events, photos, settings] = await Promise.all([listCollection("projects"), listCollection("events"), listCollection("photos"), getSettings()]);
      return json({
        projects: projects.slice(0, 200).map(withImage), events: events.slice(0, 200), settings,
        photos: photos.slice(0, 200).map((p) => ({ ...p, url: `/api/media/${p.objectKey}` })),
      });
    }
    // projetos com imagem chegam como formulário (multipart); o resto, como JSON
    let body = null, image = null;
    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      let form;
      try { form = await req.formData(); } catch { return bad("Envio inválido."); }
      body = {};
      for (const [key, value] of form.entries()) if (typeof value === "string") body[key] = value;
      image = form.get("image");
    } else body = await readJson(req);
    if (!body) return bad("JSON inválido.");

    if (req.method === "POST") {
      const store = db("sairo-content");
      if (body.table === "settings") {
        const input = body.values;
        if (!input || typeof input !== "object" || Array.isArray(input)) return bad("Configurações inválidas.");
        if (Object.keys(input).some((k) => !settingKeys.includes(k))) return bad("Campo de configuração desconhecido.");
        for (const [key, value] of Object.entries(input)) {
          if (typeof value !== "string" || value.length > 500) return bad(`Valor inválido para ${key}.`);
          if (["instagram", "agenda", "linkCartao"].includes(key) && value && !/^https:\/\//i.test(value)) return bad(`Use um endereço https:// em ${key}.`);
          if (key === "whatsapp" && value && !/^\d{11,15}$/.test(value)) return bad("WhatsApp: informe apenas números com DDI e DDD.");
          if (key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return bad("E-mail de contato inválido.");
        }
        const current = await getSettings();
        const next = { ...current };
        for (const [key, value] of Object.entries(input)) next[key] = value.trim();
        await store.setJSON("settings", next);
        return json({ ok: true });
      }
      if (body.table !== "projects" && body.table !== "events") return bad("Tabela não permitida.");
      const name = body.table;
      if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160) return bad("Informe um título de até 160 caracteres.");
      const record = { published: body.published === false || body.published === 0 || body.published === "0" ? 0 : 1 };
      for (const [key, max] of fields[name]) record[key] = clean(body[key], max);
      if (name === "events" && record.link && !/^https:\/\//i.test(record.link)) return bad("O link do evento deve começar com https://.");
      if (name === "projects" && !colors.includes(record.color)) record.color = "";
      if (isFile(image) && (!formats[image.type] || image.size > MAX_BYTES)) return bad("Envie uma imagem JPG, PNG, WebP ou GIF de até 5 MB.");
      let id = null, previous = null;
      if (body.id !== undefined && body.id !== 0 && body.id !== "") {
        if (!validId(body.id)) return bad("Identificador inválido.");
        previous = await store.get(`${name}/${body.id}`, { type: "json" });
        if (!previous) return bad("Registro não encontrado.", 404);
        id = body.id;
      }
      if (name === "projects") {
        record.objectKey = previous?.objectKey || "";
        if (isFile(image)) record.objectKey = await saveImage(image);
        else if (body.removeImage === "1") record.objectKey = "";
        record.alt = record.objectKey ? clean(body.alt, 280) : "";
      }
      id = id || newId();
      await store.setJSON(`${name}/${id}`, record);
      if (previous?.objectKey && previous.objectKey !== record.objectKey) await dropImage(previous.objectKey);
      return json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      if (!validId(body.id)) return bad("Identificador inválido.");
      if (!["projects", "events", "photos"].includes(body.table)) return bad("Tabela não permitida.");
      const store = db("sairo-content"), key = `${body.table}/${body.id}`;
      if (body.table === "photos" || body.table === "projects") {
        const current = await store.get(key, { type: "json" });
        if (current?.objectKey) await dropImage(current.objectKey);
      }
      await store.delete(key);
      return json({ ok: true });
    }
    return bad("Método não permitido.", 405);
  } catch {
    return bad("Não foi possível concluir a operação agora.", 503);
  }
};

export const config = { path: "/api/admin/records" };
