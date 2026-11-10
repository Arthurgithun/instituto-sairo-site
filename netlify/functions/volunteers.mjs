// POST /api/volunteers – cadastro público de voluntários.
import { bad, clean, db, idTime, json, newId, readJson, sameOrigin, validEmail } from "../lib/common.mjs";

const helpOptions = ["Eventos e ações de rua", "Oficinas e cultura", "Arrecadação e doações", "Divulgação e redes sociais", "Fotos e vídeos", "Outro"];
const availabilityOptions = ["Dias de semana", "Fins de semana", "Só em dias de ação", "Varia, combino com a equipe"];
const MAX_PER_HOUR = 40; // teto por hora contra cadastros em massa

export default async (req) => {
  if (req.method !== "POST") return bad("Método não permitido.", 405);
  if (!sameOrigin(req)) return bad("Origem não autorizada.", 403);
  const body = await readJson(req);
  if (!body) return bad("JSON inválido.");

  // Campo-isca: pessoas não veem, robôs preenchem. Finge sucesso e não grava.
  if (typeof body.site === "string" && body.site.trim()) return json({ ok: true });

  const name = clean(body.name, 120), whatsapp = clean(body.whatsapp, 30), email = clean(body.email, 160);
  const location = clean(body.location, 120), availability = clean(body.availability, 60), message = clean(body.message, 1000);
  const age = Number(body.age), digits = whatsapp.replace(/\D/g, "");
  if (!name) return bad("Informe o seu nome.");
  if (digits.length < 10 || digits.length > 15) return bad("Informe um WhatsApp com DDD.");
  if (email && !validEmail(email)) return bad("E-mail inválido.");
  if (!location) return bad("Informe a cidade ou o bairro.");
  if (!Number.isInteger(age) || age < 10 || age > 110) return bad("Informe uma idade válida.");
  if (!availabilityOptions.includes(availability)) return bad("Escolha a disponibilidade.");
  if (body.aceite !== true) return bad("É preciso concordar com o uso dos dados.");
  const help = [...new Set((Array.isArray(body.help) ? body.help : []).filter((v) => typeof v === "string" && helpOptions.includes(v)))].join(", ");

  try {
    const store = db("sairo-volunteers");
    const { blobs } = await store.list();
    const now = Date.now();
    if (blobs.filter((b) => now - idTime(b.key) < 3600 * 1000).length >= MAX_PER_HOUR) return bad("Muitos cadastros em pouco tempo. Tente novamente mais tarde.", 429);
    // Mesmo WhatsApp em 24h: não duplica, mas confirma para a pessoa.
    const recent = blobs.filter((b) => now - idTime(b.key) < 24 * 3600 * 1000);
    for (const blob of recent) {
      const old = await store.get(blob.key, { type: "json" });
      if (old && old.whatsapp === digits) return json({ ok: true });
    }
    await store.setJSON(newId(), { name, whatsapp: digits, email, location, age, help, availability, message, contacted: 0 });
    return json({ ok: true });
  } catch {
    return bad("Não foi possível registrar o cadastro agora.", 503);
  }
};

export const config = { path: "/api/volunteers" };
