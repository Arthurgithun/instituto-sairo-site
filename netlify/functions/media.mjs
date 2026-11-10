// GET /api/media/<arquivo> – entrega as fotos da galeria.
import { db } from "../lib/common.mjs";

export default async (req) => {
  const key = new URL(req.url).pathname.split("/").pop() || "";
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key)) return new Response("Não encontrado", { status: 404 });
  try {
    const entry = await db("sairo-media").getWithMetadata(key, { type: "arrayBuffer" });
    if (!entry) return new Response("Não encontrado", { status: 404 });
    return new Response(entry.data, {
      headers: {
        "Content-Type": entry.metadata?.contentType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Indisponível", { status: 503 });
  }
};

export const config = { path: "/api/media/*" };
