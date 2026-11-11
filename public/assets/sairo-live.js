/* Conteúdo público: somente leitura. As mudanças são feitas pelo painel /admin. */
(async function () {
  const byId = (id) => document.getElementById(id);
  const config = window.SAIRO_CONFIG || {};
  const setLink = (id, value) => {
    const link = byId(id);
    if (!link) return;
    const valid = typeof value === "string" && /^https:\/\//i.test(value);
    link.style.display = valid ? "" : "none";
    link.hidden = !valid;
    if (valid) link.href = value;
  };

  ["link-instagram", "link-agenda", "link-whats-agenda", "link-whats", "link-cartao"].forEach((id) => {
    const link = byId(id);
    if (link) link.style.display = "none";
  });
  byId("copiar").style.display = "none";
  byId("pix-chave").textContent = "Informações para doação em atualização.";
  byId("pix-cnpj").textContent = "—";
  byId("formulario").addEventListener("submit", (event) => {
    if (config.email) return;
    event.preventDefault(); event.stopImmediatePropagation();
    alert("O formulário de contato ainda está sendo configurado. Tente novamente em breve.");
  }, true);

  // ---------- seções novas: só aparecem quando têm conteúdo (ou com ?exemplo=1, para pré-visualizar) ----------
  const exemplo = /[?&]exemplo=1(&|$)/.test(location.search);
  const EXEMPLOS = {
    impact: [
      { value: "50", label: "crianças na Festa na Rua", note: "Dia das Crianças, 11 de outubro" },
      { value: "2", label: "ações de rua realizadas", note: "Natal que Acolhe e Festa na Rua" },
      { value: "20+", label: "voluntários e apoiadores", note: "Exemplo: troque pelo número real" },
    ],
    testimonials: [
      { quote: "Depoimento de exemplo: meu filho chegou em casa feliz da vida e já perguntando quando vai ter de novo.", author: "Mãe de participante", role: "" },
      { quote: "Depoimento de exemplo: ver a rua cheia de criança brincando mudou o meu dia.", author: "Voluntária", role: "Festa na Rua" },
      { quote: "Depoimento de exemplo: a Sairó faz a gente se sentir parte do bairro.", author: "Vizinho", role: "Bangu" },
    ],
    team: [
      { name: "Nome da pessoa", role: "Coordenação", bio: "Mini-apresentação de exemplo: conte em uma ou duas frases o papel desta pessoa na Sairó." },
      { name: "Nome da pessoa", role: "Comunicação", bio: "" }, { name: "Nome da pessoa", role: "Voluntariado", bio: "" },
    ],
    partners: [{ name: "Parceiro de exemplo 1" }, { name: "Parceiro de exemplo 2" }, { name: "Parceiro de exemplo 3" }],
    documents: [
      { title: "Relatório de atividades (exemplo)", year: "2026", description: "Resumo das ações realizadas no ano.", link: "https://exemplo.org/relatorio" },
      { title: "Estatuto social (exemplo)", year: "", description: "", link: "https://exemplo.org/estatuto" },
    ],
    faqs: [
      { question: "Como posso ser voluntário(a)?", answer: "É só preencher o cadastro na página de voluntários. A equipe chama você pelo WhatsApp para combinar como ajudar." },
      { question: "As ações são gratuitas?", answer: "Sim. As ações da Sairó são abertas e gratuitas para toda a comunidade." },
      { question: "Como posso apoiar a Sairó?", answer: "Você pode doar pelo Pix, divulgar as ações ou participar como voluntário(a). Veja a seção Apoie a Sairó." },
    ],
  };
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null && text !== "") node.textContent = text; return node; };
  const https = (url) => /^https:\/\//i.test(url || "");
  const paragraphs = (text) => String(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  function toggle(name, on) {
    const section = byId(name); if (section) section.hidden = !on;
    document.querySelectorAll(`[data-secao="${name}"]`).forEach((node) => { node.hidden = !on; });
  }
  function renderExtras(data) {
    const list = (key) => (data[key] && data[key].length ? data[key] : exemplo ? EXEMPLOS[key] || [] : []);
    const fill = (id, items, build, section) => { const box = byId(id); if (!box) return; box.replaceChildren(); items.forEach((item) => box.append(build(item))); toggle(section, items.length > 0); };

    fill("numeros-lista", list("impact"), (n) => { const li = el("li"); li.append(el("span", "valor", n.value), el("span", "rotulo", n.label)); if (n.note) li.append(el("span", "nota", n.note)); return li; }, "numeros");
    fill("depoimentos-lista", list("testimonials"), (t) => {
      const fig = el("figure", "depoimento"); fig.append(el("blockquote", "", t.quote));
      const cap = el("figcaption", "", t.author); if (t.role) cap.append(el("span", "", t.role)); fig.append(cap); return fig;
    }, "depoimentos");
    fill("equipe-lista", list("team"), (p) => {
      const li = el("li", "pessoa");
      if (p.url) { const img = el("img", "foto-pessoa"); img.src = p.url; img.alt = p.alt || `Foto de ${p.name}`; img.loading = "lazy"; li.append(img); }
      else li.append(Object.assign(el("div", "inicial", (p.name || "?").trim().charAt(0).toUpperCase()), { ariaHidden: "true" }));
      li.append(el("h3", "", p.name)); if (p.role) li.append(el("span", "funcao", p.role)); if (p.bio) li.append(el("p", "", p.bio)); return li;
    }, "equipe");
    fill("parceiros-lista", list("partners"), (p) => {
      const li = el("li"), box = https(p.link) ? el("a", "parceiro") : el("span", "parceiro");
      if (https(p.link)) { box.href = p.link; box.target = "_blank"; box.rel = "noopener"; }
      // logo (se houver) com o nome embaixo; a descrição da imagem vira o texto do leitor de tela
      if (p.url) { const img = el("img"); img.src = p.url; img.alt = p.alt || ""; img.loading = "lazy"; box.append(img); }
      box.append(el("span", "parceiro-nome", p.name));
      li.append(box); return li;
    }, "parceiros");
    fill("docs-lista", list("documents"), (d) => {
      const li = el("li", "doc"), text = el("div"); text.append(el("h3", "", d.title));
      if (d.year) text.append(el("span", "ano", d.year)); if (d.description) text.append(el("p", "", d.description));
      const link = el("a", "botao", "Abrir documento"); link.href = https(d.link) ? d.link : "#"; link.target = "_blank"; link.rel = "noopener";
      link.setAttribute("aria-label", `Abrir documento: ${d.title} (abre em nova aba)`); li.append(text, link); return li;
    }, "transparencia");
    fill("faq-lista", list("faqs"), (f) => { const box = el("details"); box.append(el("summary", "", f.question), el("p", "", f.answer)); return box; }, "perguntas");

    // novidades publicadas pelo painel (aparecem acima do relato da Festa)
    const news = byId("novidades-extra");
    if (news) {
      news.replaceChildren();
      (data.news || []).forEach((post) => {
        const art = el("article", "novidade"), meta = el("div", "meta");
        if (post.tag) meta.append(el("span", "etiqueta", post.tag)); if (post.date) meta.append(el("span", "", post.date));
        art.append(meta, el("h3", "", post.title));
        if (post.url) { const fig = el("figure", "novidade-foto"), img = el("img"); img.src = post.url; img.alt = post.alt || ""; img.loading = "lazy"; fig.append(img); art.append(fig); }
        paragraphs(post.body).forEach((text, i) => art.append(el("p", i === 0 ? "abertura" : "", text)));
        news.append(art);
      });
    }
    // foto do relato da Festa
    const festa = byId("festa-foto");
    if (festa) {
      const foto = data.festaFoto;
      festa.hidden = !foto; if (foto) { const img = festa.querySelector("img"); img.src = foto.url; img.alt = foto.alt || "Foto da Festa na Rua das Crianças"; }
    }
    if (exemplo && !byId("previa-exemplo")) {
      const aviso = el("aside", "previa-exemplo", "Pré-visualização com textos de exemplo. Nada disto está publicado: as seções reais só aparecem quando você preenche o painel.");
      aviso.id = "previa-exemplo"; aviso.setAttribute("aria-label", "Pré-visualização"); document.body.append(aviso);
    }
  }

  try {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) throw new Error("Conteúdo indisponível");
    const content = await response.json();
    const { projects = [], events = [], photos = [], settings = {} } = content;
    Object.assign(config, settings);
    const whats = /^\d{11,15}$/.test(config.whatsapp || "") ? `https://wa.me/${config.whatsapp}` : "";
    setLink("link-whats", whats); setLink("link-whats-agenda", whats);
    setLink("link-instagram", config.instagram); setLink("link-agenda", config.agenda);
    setLink("link-cartao", config.linkCartao);
    byId("pix-nome").textContent = config.pixNome || "Instituto Sairó";
    byId("pix-cnpj").textContent = config.pixCnpj || "—";
    byId("pix-chave").textContent = config.pixChave || "Informações para doação em atualização.";
    byId("copiar").style.display = config.pixChave ? "" : "none";

    const gallery = byId("galeria-fotos");
    photos.forEach((photo) => {
      const figure = document.createElement("figure"); figure.className = "foto";
      figure.style.setProperty("--cor", "#009bc2");
      const image = document.createElement("img"); image.src = photo.url; image.alt = photo.alt || "Foto das ações do Instituto Sairó"; image.loading = "lazy";
      figure.append(image);
      if (photo.caption) {
        const caption = document.createElement("figcaption"); caption.textContent = photo.caption;
        caption.style.cssText = "padding:12px 14px;font-weight:600;font-size:.9rem;background:#fff";
        figure.append(caption);
      }
      gallery.append(figure);
    });
    byId("mensagem-vazia").hidden = gallery.children.length > 0;

    const actions = document.querySelector(".acoes-par");
    // projetos do painel: mesmo formato dos cards do Natal e da Festa (card + janela "Conheça")
    const temas = { natal: "fundo-natal", festa: "fundo-festa", verde: "projeto-solido cor-verde", azul: "projeto-solido cor-azul",
      vermelho: "projeto-solido cor-vermelho", laranja: "projeto-solido cor-laranja", amarelo: "projeto-solido cor-amarelo" };
    const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const linhas = (t) => String(t || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const paragrafos = (t) => String(t || "").split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean);
    const tarja = (cls, text, tag = "p") => { const box = mk(tag, tag === "h3" ? "natal-pergunta" : ""); box.append(mk("span", `tarja ${cls}`, text)); return box; };
    const imagem = (cls, url, alt) => { const img = mk("img", cls); img.src = url; img.alt = alt || ""; img.loading = "lazy"; return img; };
    projects.forEach((project, i) => {
      const tema = temas[project.color] || (i % 2 === 0 ? "fundo-natal" : "fundo-festa");
      const modalId = `projeto-modal-${String(project.id || i).replace(/[^\w-]/g, "")}`;

      // card
      const card = mk("article", `acao-card projeto-card ${tema}`), topo = mk("div", "natal-topo");
      if (project.url) topo.append(imagem("natal-logo", project.url, project.alt || project.title));
      else topo.append(mk("h3", "acao-placa", project.title));
      if (project.seloUrl) topo.append(imagem("natal-selo", project.seloUrl, project.seloAlt));
      if (project.year) topo.append(tarja("v", project.year));
      const tags = String(project.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4);
      if (tags.length) { const eixos = mk("p", "eixos"); tags.forEach((t) => eixos.append(mk("span", "etiqueta", t))); topo.append(eixos); }
      const abrir = mk("button", "natal-abrir", `Conheça ${project.title}`);
      abrir.type = "button"; abrir.setAttribute("aria-haspopup", "dialog"); abrir.setAttribute("aria-controls", modalId);
      card.append(topo, abrir); actions?.append(card);

      // janela "Conheça"
      const modal = mk("dialog", `natal natal-modal projeto-modal ${tema}`); modal.id = modalId; modal.setAttribute("aria-label", project.title);
      const fechar = mk("button", "natal-fechar", "×"); fechar.type = "button"; fechar.setAttribute("aria-label", "Fechar");
      const miolo = mk("div", "natal-modal-miolo"), grade = mk("div", "natal-grade"), col1 = mk("div"), col2 = mk("div");
      const frases = linhas(project.frases);
      if (frases.length) frases.forEach((f, k) => col1.append(k === 1 ? tarja("v", f, "h3") : tarja(k % 2 === 0 ? "r" : "v", f)));
      else col1.append(tarja("v", project.title, "h3"));
      if (project.cartazUrl) col1.append(imagem("festa-cartaz projeto-cartaz", project.cartazUrl, project.cartazAlt));
      const cartao = mk("div", "natal-cartao");
      cartao.append(mk("h3", "", project.subtitulo || project.title));
      paragrafos(project.description).forEach((t) => cartao.append(mk("p", "", t)));
      const dados = [["Dia", project.dia], ["Horário", project.horario], ["Local", project.local]].filter(([, v]) => v);
      if (dados.length) { const ul = mk("ul", "festa-dados"); dados.forEach(([k, v]) => { const li = mk("li"); li.append(mk("strong", "", `${k}:`), ` ${v}`); ul.append(li); }); cartao.append(ul); }
      col2.append(cartao);
      const itens = linhas(project.lista);
      if (itens.length) {
        const titulo = tarja("a", project.listaTitulo || "Destaques:"); titulo.style.marginTop = "28px"; col2.append(titulo);
        const ul = mk("ul", "natal-lista"); itens.forEach((t) => { const li = mk("li"); li.append(mk("span", "festa-ponto"), t); li.firstChild.setAttribute("aria-hidden", "true"); ul.append(li); }); col2.append(ul);
      }
      grade.append(col1, col2); miolo.append(grade);
      const relato = paragrafos(project.relato);
      if (relato.length) {
        const sec = mk("section", "festa-relato"); sec.append(tarja("a", "Como foi:"));
        const box = mk("div", "natal-cartao festa-relato-cartao");
        if (project.relatoTitulo) box.append(mk("h3", "", project.relatoTitulo));
        relato.forEach((t) => box.append(mk("p", "", t)));
        sec.append(box); miolo.append(sec);
      }
      const fecho = mk("div", "natal-fecho"), botoes = mk("div", "natal-botoes"), contato = mk("a", "natal-botao", "Fale com a gente");
      contato.href = "#contato"; botoes.append(contato); fecho.append(botoes); miolo.append(fecho);
      modal.append(fechar, miolo); document.body.append(modal);

      abrir.addEventListener("click", () => { modal.showModal(); modal.scrollTop = 0; });
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
      fechar.addEventListener("click", () => modal.close());
      contato.addEventListener("click", () => modal.close());
    });

    const agenda = byId("agenda-eventos");
    events.forEach((event) => {
      const card = document.createElement("article");
      card.style.cssText = "background:#fff;border:3px solid #171717;border-radius:24px;padding:24px";
      const title = document.createElement("h3"); title.textContent = event.title; title.style.cssText = "font-weight:700;font-size:1.2rem;margin-bottom:8px";
      const when = document.createElement("p"); when.style.cssText = "font-size:.9rem;color:#174d3d;font-weight:700";
      if (event.date) { const date = new Date(event.date); when.textContent = Number.isNaN(date.getTime()) ? event.date : date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }); }
      const where = document.createElement("p"); where.textContent = event.location || "";
      const description = document.createElement("p"); description.textContent = event.description || "";
      card.append(title, when, where, description);
      if (/^https:\/\//i.test(event.link || "")) { const link = document.createElement("a"); link.className = "botao"; link.style.marginTop = "16px"; link.href = event.link; link.rel = "noopener"; link.target = "_blank"; link.textContent = "Saiba mais"; card.append(link); }
      agenda.append(card);
    });
    // Galeria e Agenda só aparecem quando há conteúdo cadastrado no painel
    toggle("galeria", gallery.children.length > 0);
    toggle("agenda", events.length > 0 || https(config.agenda));
    renderExtras(content);
  } catch (error) {
    console.warn("Não foi possível atualizar o conteúdo público do Sairó.", error);
    renderExtras({});
  }
})();
