// GET /api/content – conteúdo público do site (projetos, agenda, fotos, informações).
import { bad, db, getSettings, itemTables, json, listCollection, sortItems, withImage } from "../lib/common.mjs";

export default async (req) => {
  if (req.method !== "GET") return bad("Método não permitido.", 405);
  try {
    const [projects, events, photos, settings] = await Promise.all([
      listCollection("projects"), listCollection("events"), listCollection("photos"), getSettings(),
    ]);
    // seções novas: só o que está publicado, sem campos internos
    const extra = {};
    await Promise.all(Object.entries(itemTables).map(async ([table, cfg]) => {
      const rows = sortItems(table, await listCollection(table)).filter((r) => r.published !== 0).slice(0, 60);
      extra[table] = rows.map((row) => {
        const out = { id: row.id };
        for (const [key] of cfg.fields) out[key] = row[key] || "";
        if (cfg.image && row.objectKey) { out.url = `/api/media/${row.objectKey}`; out.alt = row.alt || ""; }
        return out;
      });
    }));
    const festa = (await db("sairo-content").get("festa-foto", { type: "json" })) || null;
    return json({
      ...extra,
      festaFoto: festa?.objectKey ? { url: `/api/media/${festa.objectKey}`, alt: festa.alt || "" } : null,
      projects: projects.filter((p) => p.published !== 0).slice(0, 30).map((p) => {
        const out = { id: p.id };
        for (const key of ["title", "year", "description", "tags", "color", "frases", "subtitulo", "dia", "horario", "local", "listaTitulo", "lista", "relatoTitulo", "relato"]) out[key] = p[key] || "";
        if (p.objectKey) { out.url = `/api/media/${p.objectKey}`; out.alt = p.alt || ""; }
        if (p.seloKey) { out.seloUrl = `/api/media/${p.seloKey}`; out.seloAlt = p.seloAlt || ""; }
        if (p.cartazKey) { out.cartazUrl = `/api/media/${p.cartazKey}`; out.cartazAlt = p.cartazAlt || ""; }
        return out;
      }),
      events: events.filter((e) => e.published !== 0).slice(0, 40)
        .map(({ id, title, date, location, description, link }) => ({ id, title, date, location, description, link }))
        .sort((a, b) => (a.date || "\uffff").localeCompare(b.date || "\uffff")),
      photos: photos.slice(0, 60).map(({ id, objectKey, caption, alt }) => ({ id, objectKey, caption, alt, url: `/api/media/${objectKey}` })),
      settings,
    });
  } catch {
    return bad("Não foi possível carregar o conteúdo.", 503);
  }
};

export const config = { path: "/api/content" };
