// /api/admin/records – projetos, agenda, fotos e informações (leitura, gravação e exclusão).
import { bad, clean, db, getSettings, json, listCollection, newId, readJson, requireAdmin, validId } from "../lib/common.mjs";

const settingKeys = ["email", "whatsapp", "instagram", "agenda", "pixNome", "pixCnpj", "pixChave", "linkCartao"];
const fields = {
  projects: [["title", 160], ["year", 500], ["description", 4000]],
  events: [["title", 160], ["date", 500], ["location", 500], ["description", 4000], ["link", 500]],
};

export default async (req) => {
  const write = req.method !== "GET";
  const { error } = await requireAdmin(req, { write });
  if (error) return error;
  try {
    if (req.method === "GET") {
      const [projects, events, photos, settings] = await Promise.all([listCollection("projects"), listCollection("events"), listCollection("photos"), getSettings()]);
      return json({
        projects: projects.slice(0, 200), events: events.slice(0, 200), settings,
        photos: photos.slice(0, 200).map((p) => ({ ...p, url: `/api/media/${p.objectKey}` })),
      });
    }
    const body = await readJson(req);
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
      const record = { published: body.published === false || body.published === 0 ? 0 : 1 };
      for (const [key, max] of fields[name]) record[key] = clean(body[key], max);
      if (name === "events" && record.link && !/^https:\/\//i.test(record.link)) return bad("O link do evento deve começar com https://.");
      if (body.id !== undefined && body.id !== 0 && body.id !== "") {
        if (!validId(body.id)) return bad("Identificador inválido.");
        const key = `${name}/${body.id}`;
        if (!(await store.get(key, { type: "json" }))) return bad("Registro não encontrado.", 404);
        await store.setJSON(key, record);
        return json({ ok: true, id: body.id });
      }
      const id = newId();
      await store.setJSON(`${name}/${id}`, record);
      return json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      if (!validId(body.id)) return bad("Identificador inválido.");
      if (!["projects", "events", "photos"].includes(body.table)) return bad("Tabela não permitida.");
      const store = db("sairo-content"), key = `${body.table}/${body.id}`;
      if (body.table === "photos") {
        const photo = await store.get(key, { type: "json" });
        if (photo?.objectKey) await db("sairo-media").delete(photo.objectKey);
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
