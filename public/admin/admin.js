/* Painel do Instituto Sairó – página única, sem dependências. Fala com /api/admin/*. */
(() => {
  "use strict";
  const app = document.getElementById("app");
  const state = {
    me: null, tab: "overview", busy: false, ok: "", err: "", menu: false, editing: null,
    data: { projects: [], events: [], photos: [], settings: {} }, volunteers: null, team: null, items: null,
  };
  const settingsFields = [
    ["email", "E-mail de contato", "contato@instituto.org.br"], ["whatsapp", "WhatsApp (DDI + DDD + número)", "5521999999999"],
    ["instagram", "Link do Instagram", "https://instagram.com/..."], ["agenda", "Link da agenda completa", "https://..."],
    ["pixNome", "Nome do favorecido Pix", "Nome da instituição"], ["pixCnpj", "CNPJ", "00.000.000/0001-00"],
    ["pixChave", "Chave Pix pública", "Chave para receber doações"], ["linkCartao", "Link de doação por cartão", "https://..."],
  ];

  // ---------- utilidades ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === false || value == null) continue;
      if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
      else if (key === "class") el.className = value;
      else if (key === "value") el.value = value;
      else if (key === "checked") el.checked = Boolean(value);
      else el.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) if (child != null && child !== false) el.append(child.nodeType ? child : document.createTextNode(String(child)));
    return el;
  }
  const fmtDate = (value) => { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }); };
  let timer;
  function say(ok, err) { state.ok = ok || ""; state.err = err || ""; clearTimeout(timer); if (ok) timer = setTimeout(() => { state.ok = ""; render(); }, 4500); }

  async function api(path, { method = "GET", body, form } = {}) {
    const init = { method, cache: "no-store", credentials: "same-origin" };
    if (form) init.body = form;
    else if (body !== undefined) { init.headers = { "Content-Type": "application/json" }; init.body = JSON.stringify(body); }
    let response, result = {};
    try { response = await fetch(path, init); } catch { throw new Error("Sem conexão com o servidor. Tente de novo."); }
    try { result = await response.json(); } catch { /* resposta sem JSON */ }
    if (response.status === 401 && path !== "/api/admin/login") { state.me = null; renderLogin(); throw new Error(result.error || "Sessão expirada."); }
    if (!response.ok) throw new Error(result.error || "Algo deu errado. Tente novamente.");
    return result;
  }
  // Executa uma ação com aviso de sucesso/erro e atualização da tela.
  async function run(action, success) {
    state.busy = true; say(); render();
    try { await action(); say(success); } catch (e) { say("", e.message || "Falha na operação."); }
    finally { state.busy = false; render(); }
  }
  const loadData = async () => { state.data = await api("/api/admin/records"); };
  const loadVolunteers = async () => { state.volunteers = (await api("/api/admin/volunteers")).volunteers; };
  const loadItems = async () => { state.items = await api("/api/admin/items"); };
  const loadTeam = async () => { state.team = await api("/api/admin/users"); };

  // ---------- login ----------
  const iconeEmail = '<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
  const iconeSenha = '<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  function renderLogin(message) {
    const email = h("input", { type: "email", required: true, autocomplete: "username", id: "login-email", placeholder: "voce@exemplo.com" });
    const senha = h("input", { type: "password", required: true, autocomplete: "current-password", id: "login-senha", placeholder: "Sua senha" });
    const ver = h("button", { type: "button", class: "ver", "aria-label": "Mostrar senha", onclick: () => {
      const mostrar = senha.type === "password";
      senha.type = mostrar ? "text" : "password";
      ver.textContent = mostrar ? "Ocultar" : "Mostrar";
      ver.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
      senha.focus();
    } }, "Mostrar");
    const aviso = h("div", { class: "aviso erro", role: "alert", hidden: !message }, message || "");
    const botao = h("button", { class: "btn", type: "submit" }, "Entrar");
    const comIcone = (svg, ...filhos) => { const caixa = h("span", { class: filhos.length > 1 ? "login-entrada com-ver" : "login-entrada" }, ...filhos); caixa.insertAdjacentHTML("afterbegin", svg); return caixa; };
    const form = h("form", { class: "login-corpo", onsubmit: async (e) => {
      e.preventDefault(); botao.disabled = true; aviso.hidden = true;
      try {
        await api("/api/admin/login", { method: "POST", body: { email: email.value, password: senha.value } });
        await start();
      } catch (err) { aviso.textContent = err.message; aviso.hidden = false; botao.disabled = false; senha.value = ""; senha.focus(); }
    } },
      h("label", { class: "campo" }, "E-mail", comIcone(iconeEmail, email)),
      h("label", { class: "campo" }, "Senha", comIcone(iconeSenha, senha, ver)),
      aviso, botao);
    app.replaceChildren(h("main", { class: "login-pagina" },
      h("aside", { class: "login-lado" },
        h("div", { class: "login-nome" }, "Sairó", h("small", {}, "Instituto")),
        h("div", { class: "login-arte" }, h("img", { src: "/assets/passaro.jpg", alt: "" })),
        h("p", { class: "login-frase" }, "Mais que projetos, ", h("em", {}, "movimentos de vida."))),
      h("section", { class: "login-area" }, h("div", { class: "login-cartao" },
        h("small", {}, "Área da equipe"),
        h("h1", {}, "Painel administrativo"),
        h("p", { class: "login-intro" }, "Entre para atualizar projetos, agenda, galeria e voluntários."),
        form,
        h("div", { class: "login-rodape" },
          h("span", {}, "Problemas para entrar? Peça ao responsável pelo site para conferir o seu acesso."),
          h("a", { href: "/" }, "← Voltar ao site"))))));
    email.focus();
  }

  // ---------- estrutura ----------
  // Abas do painel, em grupos. As "i-..." editam as seções do site (ver itemViews).
  const groups = () => [
    ["Gerenciar", [["overview", "Visão geral"], ["projects", "Projetos"], ["events", "Agenda"], ["photos", "Galeria"], ["i-news", "Novidades"], ["volunteers", "Voluntários"], ["settings", "Informações"]]],
    ["Seções do site", [["i-impact", "Números de impacto"], ["i-partners", "Parceiros"], ["i-documents", "Transparência"], ["i-team", "Quem faz a Sairó"], ["i-faqs", "Perguntas frequentes"], ["i-testimonials", "Depoimentos"]]],
    ["Acesso", [state.me.owner ? ["team", "Acessos ao painel"] : ["account", "Minha senha"]]],
  ];
  const tabs = () => groups().flatMap(([, list]) => list);
  function go(tab) {
    state.tab = tab; state.editing = null; state.menu = false; say(); render();
    if (tab === "volunteers") loadVolunteers().then(render, (e) => { say("", e.message); render(); });
    if (tab === "team") loadTeam().then(render, (e) => { say("", e.message); render(); });
    if (tab.startsWith("i-")) loadItems().then(render, (e) => { say("", e.message); render(); });
  }
  function shell(content) {
    const title = (tabs().find(([id]) => id === state.tab) || [])[1] || "Painel";
    app.replaceChildren(h("div", { class: "layout" },
      h("aside", { class: "lateral" + (state.menu ? " aberto" : "") },
        h("a", { class: "marca", href: "/" }, h("img", { src: "/assets/logo.png", alt: "Sairó" }), h("div", {}, h("b", {}, "SAIRÓ"), h("small", {}, "Administração"))),
        h("nav", { "aria-label": "Painel administrativo" }, groups().map(([rotulo, list]) => h("div", { class: "grupo" },
          h("div", { class: "rotulo" }, rotulo),
          list.map(([id, label]) => h("button", { class: state.tab === id ? "ativo" : "", "aria-current": state.tab === id ? "page" : false, onclick: () => go(id) }, label))))),
        h("div", { class: "rodape" }, h("a", { href: "/" }, "Ver site institucional"),
          h("button", { onclick: async () => { try { await api("/api/admin/logout", { method: "POST" }); } catch { /* sai mesmo assim */ } state.me = null; renderLogin(); } }, "Sair da conta"))),
      h("button", { class: "fundo-menu" + (state.menu ? " aberto" : ""), "aria-label": "Fechar menu", onclick: () => { state.menu = false; render(); } }),
      h("main", { class: "principal" },
        h("header", { class: "topo" }, h("div", { class: "topo-esq" },
          h("button", { class: "menu-botao", "aria-label": "Abrir menu", onclick: () => { state.menu = true; render(); } }, "☰"),
          h("div", {}, h("p", { class: "sobre" }, "Instituto Sairó / Painel"), h("h1", {}, title))),
          h("span", { class: "ola" }, "Olá, ", (state.me.name || state.me.email).split(" ")[0], "!")),
        state.err && h("div", { class: "aviso erro", role: "alert" }, state.err),
        state.ok && h("div", { class: "aviso ok", role: "status" }, "✓ " + state.ok),
        content)));
  }

  // ---------- telas ----------
  function viewOverview() {
    const d = state.data, nv = state.volunteers ? state.volunteers.length : "–";
    const card = (label, value, tab) => h("button", { class: "numero", onclick: () => go(tab) }, h("b", {}, value), h("span", {}, label));
    return h("div", {},
      h("section", { class: "boas-vindas" }, h("small", {}, "Seu espaço de gestão"), h("h2", {}, "Cada ação transforma uma história."),
        h("p", {}, "Organize projetos, publique a agenda, receba voluntários e compartilhe os registros do Instituto Sairó."),
        h("button", { class: "btn amarelo", onclick: () => go("projects") }, "Cadastrar projeto")),
      h("div", { class: "grade-4" },
        card("Projetos cadastrados", d.projects.length, "projects"), card("Eventos na agenda", d.events.length, "events"),
        card("Fotos na galeria", d.photos.length, "photos"), card("Voluntários cadastrados", nv, "volunteers")),
      h("div", { class: "cartao", style: "margin-top:28px" }, h("h2", {}, "Como começar?"),
        h("ol", { class: "passos" }, h("li", {}, "Cadastre um projeto ou evento."), h("li", {}, "Envie fotografias para a galeria."),
          h("li", {}, "Preencha as informações oficiais de contato e doações."), h("li", {}, "Use ", h("b", {}, "Ver site institucional"), " para conferir o resultado."))));
  }

  function viewRecords(kind) {
    const isProject = kind === "projects", list = state.data[kind], ed = state.editing;
    const f = {
      title: h("input", { required: true, maxlength: 160, value: ed?.title || "", placeholder: isProject ? "Nome do projeto" : "Nome do evento" }),
      year: h("input", { value: ed?.year || "", placeholder: "Ex.: 2026" }),
      date: h("input", { type: "datetime-local", value: ed?.date || "" }),
      location: h("input", { value: ed?.location || "", placeholder: "Local do encontro" }),
      link: h("input", { type: "url", value: ed?.link || "", placeholder: "https://..." }),
      description: h("textarea", { rows: 5, placeholder: "Conte a história, o propósito e os detalhes..." }, ed?.description || ""),
      published: h("input", { type: "checkbox", checked: ed ? ed.published !== 0 : true }),
    };
    f.description.value = ed?.description || "";
    const form = h("form", { class: "cartao form", onsubmit: (e) => {
      e.preventDefault();
      const body = { table: kind, id: ed?.id, title: f.title.value, description: f.description.value, published: f.published.checked ? 1 : 0 };
      if (isProject) body.year = f.year.value; else Object.assign(body, { date: f.date.value, location: f.location.value, link: f.link.value });
      run(async () => { await api("/api/admin/records", { method: "POST", body }); state.editing = null; await loadData(); }, "Registro salvo com sucesso.");
    } },
      h("h2", {}, ed ? "Editar registro" : isProject ? "Novo projeto" : "Novo evento"),
      h("label", { class: "campo" }, "Título", f.title),
      isProject ? h("label", { class: "campo" }, "Ano", f.year) : [h("label", { class: "campo" }, "Data e horário", f.date), h("label", { class: "campo" }, "Local", f.location), h("label", { class: "campo" }, "Link para inscrições (opcional)", f.link)],
      h("label", { class: "campo" }, "Descrição", f.description),
      h("label", { class: "linha-marca" }, f.published, "Publicar no site"),
      h("div", { class: "botoes" }, h("button", { class: "btn", type: "submit", disabled: state.busy }, state.busy ? "Salvando..." : "Salvar"),
        ed && h("button", { class: "btn contorno", type: "button", onclick: () => { state.editing = null; render(); } }, "Cancelar")));
    const items = list.length === 0 ? h("div", { class: "vazio" }, "Nenhum registro adicionado ainda.") : list.map((r) =>
      h("article", { class: "item" }, h("span", { class: "selo " + (r.published === 0 ? "rasc" : "pub") }, r.published === 0 ? "Rascunho" : "Publicado"),
        h("h3", {}, r.title), h("p", { class: "meta" }, isProject ? r.year : [r.date && fmtDate(r.date), r.location].filter(Boolean).join(" • ")),
        h("p", { class: "texto" }, r.description),
        h("div", { class: "botoes" }, h("button", { class: "btn amarelo pequeno", onclick: () => { state.editing = r; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } }, "Editar"),
          h("button", { class: "btn perigo pequeno", disabled: state.busy, onclick: () => {
            if (!confirm("Deseja realmente excluir este registro? Essa ação não pode ser desfeita.")) return;
            run(async () => { await api("/api/admin/records", { method: "DELETE", body: { table: kind, id: r.id } }); await loadData(); }, "Registro removido.");
          } }, "Excluir"))));
    return h("div", { class: "duas-colunas" }, form, h("div", { class: "lista" }, h("h2", { class: "titulo-lista" }, "Registros cadastrados ", h("small", {}, `(${list.length})`)), items));
  }

  // Reduz a foto antes de enviar (a Netlify aceita até ~6 MB por envio).
  async function shrink(file) {
    if (file.type === "image/gif" || !("createImageBitmap" in window)) return file;
    try {
      const bitmap = await createImageBitmap(file), scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
    } catch { return file; }
  }
  function viewPhotos() {
    let chosen = null;
    const nome = h("span", {}, "Clique para escolher uma foto");
    const input = h("input", { type: "file", id: "foto-arquivo", class: "sr", accept: "image/png,image/jpeg,image/webp,image/gif", onchange: () => { chosen = input.files[0] || null; nome.textContent = chosen ? chosen.name : "Clique para escolher uma foto"; send.disabled = !chosen || state.busy; } });
    const legenda = h("textarea", { rows: 4, placeholder: "Descreva o momento registrado..." });
    const send = h("button", { class: "btn", type: "submit", disabled: true }, state.busy ? "Enviando..." : "Publicar foto");
    const form = h("form", { class: "cartao envio", onsubmit: (e) => {
      e.preventDefault(); if (!chosen) return;
      run(async () => {
        const file = await shrink(chosen), body = new FormData();
        body.append("image", file); body.append("caption", legenda.value); body.append("alt", legenda.value || "Foto das ações do Instituto Sairó");
        await api("/api/admin/upload", { method: "POST", form: body }); await loadData();
      }, "Foto enviada e publicada na galeria.");
    } },
      h("div", {}, h("h2", {}, "Adicionar foto"), h("p", { class: "dica", style: "margin:8px 0 20px" }, "Imagens JPG, PNG, WebP ou GIF. Fotos grandes são reduzidas automaticamente."),
        h("label", { class: "area", for: "foto-arquivo" }, "📷", nome, input)),
      h("div", { class: "form", style: "align-content:end" }, h("label", { class: "campo" }, "Legenda", legenda), send));
    const photos = state.data.photos;
    return h("div", { class: "form", style: "gap:28px" }, form, h("div", {}, h("h2", { class: "titulo-lista", style: "margin-bottom:18px" }, `Fotos publicadas (${photos.length})`),
      photos.length === 0 ? h("div", { class: "vazio" }, "A galeria está vazia. As próximas fotos aparecerão aqui e no site.") :
        h("div", { class: "grade-3" }, photos.map((p) => h("article", { class: "foto" }, h("img", { src: p.url, alt: p.alt || "" }),
          h("div", {}, h("span", {}, p.caption || p.alt), h("button", { class: "btn perigo pequeno", disabled: state.busy, "aria-label": "Excluir foto", onclick: () => {
            if (!confirm("Excluir esta foto da galeria?")) return;
            run(async () => { await api("/api/admin/records", { method: "DELETE", body: { table: "photos", id: p.id } }); await loadData(); }, "Foto removida.");
          } }, "Excluir")))))));
  }

  function exportCsv() {
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Data", "Nome", "WhatsApp", "E-mail", "Cidade/bairro", "Idade", "Quer ajudar com", "Disponibilidade", "Mensagem", "Já contatado"];
    const rows = state.volunteers.map((v) => [fmtDate(v.createdAt), v.name, v.whatsapp, v.email, v.location, v.age, v.help, v.availability, v.message, v.contacted ? "Sim" : "Não"].map(cell).join(";"));
    const blob = new Blob(["﻿" + [head.map(cell).join(";"), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "voluntarios-sairo.csv" }); a.click(); URL.revokeObjectURL(a.href);
  }
  function viewVolunteers() {
    const list = state.volunteers;
    return h("div", { class: "form", style: "gap:24px" },
      h("div", { class: "topo-lista" }, h("div", {}, h("h2", { class: "titulo-lista" }, "Cadastros recebidos ", h("small", {}, `(${list ? list.length : 0})`)),
        h("p", { class: "dica", style: "margin-top:4px" }, "Pessoas que se cadastraram pelo site. Os dados são pessoais: use só para chamar para as ações e apague quando não precisar mais.")),
        h("button", { class: "btn contorno", disabled: !list || list.length === 0, onclick: exportCsv }, "⬇ Baixar planilha (CSV)")),
      !list ? h("p", { class: "carregando", style: "padding:20px 0" }, "Carregando cadastros...") : list.length === 0 ? h("div", { class: "vazio" }, "Nenhum voluntário cadastrado ainda.") :
        h("div", { class: "grade-2" }, list.map((v) => {
          const phone = v.whatsapp.length <= 11 ? "55" + v.whatsapp : v.whatsapp;
          return h("article", { class: "item" }, h("span", { class: "selo " + (v.contacted ? "pub" : "novo") }, v.contacted ? "Já contatado" : "Novo"),
            h("h3", {}, v.name), h("p", { class: "meta" }, [v.location, `${v.age} anos`, fmtDate(v.createdAt)].join(" • ")),
            h("div", { class: "dados" },
              h("div", {}, h("b", {}, "WhatsApp: "), h("a", { href: "https://wa.me/" + phone, target: "_blank", rel: "noopener noreferrer" }, v.whatsapp)),
              v.email && h("div", {}, h("b", {}, "E-mail: "), h("a", { href: "mailto:" + v.email }, v.email)),
              h("div", {}, h("b", {}, "Quer ajudar com: "), v.help || "não informado"), h("div", {}, h("b", {}, "Disponibilidade: "), v.availability),
              v.message && h("div", {}, h("b", {}, "Mensagem: "), v.message)),
            h("div", { class: "botoes" },
              h("button", { class: "btn amarelo pequeno", disabled: state.busy, onclick: () => run(async () => { await api("/api/admin/volunteers", { method: "PATCH", body: { id: v.id, contacted: !v.contacted } }); await loadVolunteers(); }) }, v.contacted ? "Marcar como novo" : "Marcar como contatado"),
              h("button", { class: "btn perigo pequeno", disabled: state.busy, onclick: () => {
                if (!confirm("Excluir este cadastro? Os dados da pessoa serão apagados e isso não pode ser desfeito.")) return;
                run(async () => { await api("/api/admin/volunteers", { method: "DELETE", body: { id: v.id } }); await loadVolunteers(); }, "Cadastro removido.");
              } }, "Excluir")));
        })));
  }

  function viewSettings() {
    const s = state.data.settings || {}, inputs = {};
    const form = h("form", { class: "cartao form", style: "max-width:760px", onsubmit: (e) => {
      e.preventDefault();
      const values = Object.fromEntries(settingsFields.map(([key]) => [key, inputs[key].value]));
      run(async () => { await api("/api/admin/records", { method: "POST", body: { table: "settings", values } }); await loadData(); }, "Informações atualizadas no site.");
    } },
      h("h2", {}, "Informações oficiais"), h("p", { class: "dica" }, "Preencha somente os dados que deseja tornar públicos. Campos vazios escondem o respectivo link."),
      h("div", { class: "duas" }, settingsFields.map(([key, label, hint]) => h("label", { class: "campo" }, label, (inputs[key] = h("input", { value: s[key] || "", placeholder: hint }))))),
      h("div", { class: "destaque" }, "A chave Pix será exibida para visitantes. Verifique os dados antes de salvar. Não informe senhas, tokens nem dados bancários privados."),
      h("div", { class: "botoes" }, h("button", { class: "btn", type: "submit", disabled: state.busy }, state.busy ? "Salvando..." : "Salvar informações")));
    return form;
  }

  function viewTeam() {
    const t = state.team, nome = h("input", { placeholder: "Nome" }), email = h("input", { type: "email", required: true, placeholder: "pessoa@email.com" });
    const senha = h("input", { type: "text", required: true, minlength: 10, autocomplete: "off", placeholder: "Senha provisória (mín. 10 caracteres)" });
    const novo = h("form", { class: "cartao form", onsubmit: (e) => {
      e.preventDefault();
      run(async () => { await api("/api/admin/users", { method: "POST", body: { name: nome.value, email: email.value, password: senha.value } }); await loadTeam(); }, "Pessoa adicionada à equipe. Envie a ela o e-mail e a senha provisória.");
    } },
      h("h2", {}, "Adicionar pessoa à equipe"), h("p", { class: "dica" }, "Quem for adicionada entra no painel com este e-mail e esta senha, e pode trocá-la depois em “Minha senha”."),
      h("label", { class: "campo" }, "Nome", nome), h("label", { class: "campo" }, "E-mail", email), h("label", { class: "campo" }, "Senha provisória", senha),
      h("div", { class: "botoes" }, h("button", { class: "btn", type: "submit", disabled: state.busy }, "Adicionar")));
    const lista = !t ? h("p", { class: "carregando", style: "padding:20px 0" }, "Carregando equipe...") : [
      h("article", { class: "item" }, h("span", { class: "selo pub" }, "Responsável principal"), h("h3", {}, t.owner.email),
        h("p", { class: "meta" }, "A senha desta conta é trocada na Netlify (variável ADMIN_PASSWORD).")),
      ...t.users.map((u) => {
        const nova = h("input", { type: "text", minlength: 10, placeholder: "Nova senha (mín. 10 caracteres)", "aria-label": "Nova senha de " + u.email });
        return h("article", { class: "item" }, h("h3", {}, u.name || u.email), h("p", { class: "meta" }, u.email),
          h("div", { class: "botoes" }, nova,
            h("button", { class: "btn amarelo pequeno", disabled: state.busy, onclick: () => { if (nova.value.length < 10) { say("", "A nova senha precisa ter pelo menos 10 caracteres."); render(); return; }
              run(async () => { await api("/api/admin/users", { method: "PATCH", body: { email: u.email, password: nova.value } }); }, "Senha redefinida."); } }, "Redefinir senha"),
            h("button", { class: "btn perigo pequeno", disabled: state.busy, onclick: () => { if (!confirm(`Remover o acesso de ${u.email}?`)) return;
              run(async () => { await api("/api/admin/users", { method: "DELETE", body: { email: u.email } }); await loadTeam(); }, "Acesso removido."); } }, "Remover acesso")));
      })];
    return h("div", { class: "duas-colunas" }, novo, h("div", { class: "lista" }, h("h2", { class: "titulo-lista" }, "Quem tem acesso"), lista));
  }

  function viewAccount() {
    const atual = h("input", { type: "password", required: true, autocomplete: "current-password" }), nova = h("input", { type: "password", required: true, minlength: 10, autocomplete: "new-password" });
    return h("form", { class: "cartao form", style: "max-width:520px", onsubmit: (e) => {
      e.preventDefault();
      run(async () => { await api("/api/admin/password", { method: "POST", body: { current: atual.value, next: nova.value } }); }, "Senha alterada.");
    } },
      h("h2", {}, "Trocar minha senha"), h("p", { class: "dica" }, "Conta: " + state.me.email),
      h("label", { class: "campo" }, "Senha atual", atual), h("label", { class: "campo" }, "Nova senha (mínimo 10 caracteres)", nova),
      h("div", { class: "botoes" }, h("button", { class: "btn", type: "submit", disabled: state.busy }, "Salvar nova senha")));
  }


  // ---------- seções do site (números, parceiros, transparência, equipe, perguntas, depoimentos, novidades) ----------
  // campos: [chave, rótulo, tipo (text|area|url), obrigatório, dica]
  const itemViews = {
    "i-news": { table: "news", novo: "Nova novidade", plural: "Novidades publicadas", imagem: "Foto da novidade (opcional)", ordem: false,
      intro: "Relatos e notícias que aparecem na seção Novidades do site, logo acima do relato da Festa. A mais nova aparece primeiro.",
      campos: [["title", "Título", "text", true], ["tag", "Etiqueta (ex.: Cultura)", "text"], ["date", "Data (ex.: 20 de outubro)", "text"], ["body", "Texto (separe os parágrafos com uma linha em branco)", "area", true]],
      titulo: (r) => r.title, meta: (r) => [r.tag, r.date].filter(Boolean).join(" • "), texto: (r) => r.body },
    "i-impact": { table: "impact", novo: "Novo número", plural: "Números cadastrados", ordem: true,
      intro: "Números que aparecem em destaque no site (ex.: “50” + “crianças na Festa”). Use só dados reais e confirmados.",
      campos: [["value", "Número (ex.: 50, 8 ou 120+)", "text", true], ["label", "O que ele mede (ex.: crianças na Festa)", "text", true], ["note", "Observação curta (opcional, ex.: Dia das Crianças 2026)", "text"]],
      titulo: (r) => `${r.value} — ${r.label}`, meta: (r) => r.note, texto: () => "" },
    "i-partners": { table: "partners", novo: "Novo parceiro", plural: "Parceiros cadastrados", imagem: "Logo (opcional)", ordem: true,
      intro: "Quem apoia a Sairó. Se não houver logo, o site mostra o nome. Peça autorização antes de publicar o nome ou a marca de alguém.",
      campos: [["name", "Nome do parceiro/apoiador", "text", true], ["link", "Site ou rede social (opcional, https://...)", "url"]],
      titulo: (r) => r.name, meta: (r) => r.link, texto: () => "" },
    "i-documents": { table: "documents", novo: "Novo documento", plural: "Documentos cadastrados", ordem: true,
      intro: "Relatórios, prestação de contas, estatuto e outros documentos. Suba o arquivo (PDF) no Google Drive ou similar, deixe o acesso por link e cole o endereço aqui.",
      campos: [["title", "Título (ex.: Relatório de atividades 2026)", "text", true], ["year", "Ano ou período (opcional)", "text"], ["description", "Descrição curta (opcional)", "area"], ["link", "Link do documento (https://...)", "url", true]],
      titulo: (r) => r.title, meta: (r) => [r.year, r.link].filter(Boolean).join(" • "), texto: (r) => r.description },
    "i-team": { table: "team", novo: "Nova pessoa", plural: "Pessoas cadastradas", imagem: "Foto (opcional)", ordem: true,
      intro: "Quem faz a Sairó acontecer. Só publique fotos e nomes com a autorização da pessoa (e do responsável, se for menor de idade).",
      campos: [["name", "Nome", "text", true], ["role", "Função (ex.: Coordenação)", "text"], ["bio", "Mini-apresentação (opcional)", "area"]],
      titulo: (r) => r.name, meta: (r) => r.role, texto: (r) => r.bio },
    "i-faqs": { table: "faqs", novo: "Nova pergunta", plural: "Perguntas cadastradas", ordem: true,
      intro: "Dúvidas comuns de quem visita o site (voluntariado, doações, participação nas ações).",
      campos: [["question", "Pergunta", "text", true], ["answer", "Resposta", "area", true]],
      titulo: (r) => r.question, meta: () => "", texto: (r) => r.answer },
    "i-testimonials": { table: "testimonials", novo: "Novo depoimento", plural: "Depoimentos cadastrados", ordem: true,
      intro: "Falas de famílias, voluntários e apoiadores. Publique só com a autorização de quem falou.",
      campos: [["quote", "Depoimento", "area", true], ["author", "Quem disse (nome ou “Mãe de participante”)", "text", true], ["role", "Quem é (opcional, ex.: voluntária)", "text"]],
      titulo: (r) => r.author, meta: (r) => r.role, texto: (r) => r.quote },
  };

  function viewFestaFoto() {
    const atual = state.items?.festaFoto || {};
    let chosen = null;
    const nome = h("span", {}, "Clique para escolher uma foto");
    const input = h("input", { type: "file", id: "festa-arquivo", class: "sr", accept: "image/png,image/jpeg,image/webp,image/gif", onchange: () => { chosen = input.files[0] || null; nome.textContent = chosen ? chosen.name : "Clique para escolher uma foto"; enviar.disabled = !chosen; } });
    const alt = h("input", { value: atual.alt || "", placeholder: "Descreva a foto para quem não enxerga (ex.: crianças brincando na rua)" });
    const enviar = h("button", { class: "btn", type: "submit", disabled: true }, "Salvar foto");
    return h("form", { class: "cartao envio", onsubmit: (e) => {
      e.preventDefault(); if (!chosen) return;
      run(async () => {
        const body = new FormData(); body.append("table", "festaFoto"); body.append("image", await shrink(chosen)); body.append("alt", alt.value);
        await api("/api/admin/items", { method: "POST", form: body }); await loadItems();
      }, "Foto do relato da Festa atualizada.");
    } },
      h("div", {}, h("h2", {}, "Foto do relato da Festa"), h("p", { class: "dica", style: "margin:8px 0 16px" }, "Aparece no topo do relato “Uma manhã de festa na rua”, na seção Novidades."),
        atual.url ? h("img", { class: "previa", src: atual.url, alt: atual.alt || "Foto atual do relato" }) : h("p", { class: "dica" }, "Ainda sem foto."),
        h("label", { class: "area", for: "festa-arquivo" }, "📷", nome, input)),
      h("div", { class: "form", style: "align-content:end" }, h("label", { class: "campo" }, "Descrição da foto", alt), enviar,
        atual.url && h("button", { class: "btn perigo", type: "button", disabled: state.busy, onclick: () => {
          if (!confirm("Remover a foto do relato da Festa?")) return;
          run(async () => { await api("/api/admin/items", { method: "DELETE", body: { table: "festaFoto" } }); await loadItems(); }, "Foto removida.");
        } }, "Remover foto atual")));
  }

  function viewItems(tab) {
    const cfg = itemViews[tab], ed = state.editing, list = state.items ? state.items[cfg.table] : null;
    if (!list) return h("p", { class: "carregando", style: "padding:20px 0" }, "Carregando...");
    const f = {};
    cfg.campos.forEach(([key, , kind]) => {
      f[key] = kind === "area" ? h("textarea", { rows: 5 }) : h("input", { type: kind === "url" ? "url" : "text", maxlength: 500 });
      f[key].value = ed?.[key] || "";
    });
    const ordem = h("input", { type: "number", min: 0, max: 999, value: ed?.ordem ?? 0 });
    const published = h("input", { type: "checkbox", checked: ed ? ed.published !== 0 : true });
    let chosen = null;
    const nomeArq = h("span", {}, "Clique para escolher uma imagem");
    const arquivo = h("input", { type: "file", id: "item-arquivo", class: "sr", accept: "image/png,image/jpeg,image/webp,image/gif", onchange: () => { chosen = arquivo.files[0] || null; nomeArq.textContent = chosen ? chosen.name : "Clique para escolher uma imagem"; } });
    const remover = h("input", { type: "checkbox" });
    const alt = h("input", { value: ed?.alt || "", placeholder: "Descrição da imagem (acessibilidade)" });
    const form = h("form", { class: "cartao form", onsubmit: (e) => {
      e.preventDefault();
      run(async () => {
        const body = new FormData();
        body.append("table", cfg.table); if (ed?.id) body.append("id", ed.id);
        cfg.campos.forEach(([key]) => body.append(key, f[key].value));
        if (cfg.ordem) body.append("ordem", ordem.value);
        body.append("published", published.checked ? "1" : "0");
        if (cfg.imagem) { if (chosen) body.append("image", await shrink(chosen)); if (remover.checked) body.append("removeImage", "1"); body.append("alt", alt.value); }
        await api("/api/admin/items", { method: "POST", form: body }); state.editing = null; await loadItems();
      }, "Salvo com sucesso.");
    } },
      h("h2", {}, ed ? "Editar" : cfg.novo),
      cfg.campos.map(([key, label, , required]) => h("label", { class: "campo" }, label + (required ? " *" : ""), f[key])),
      cfg.imagem && h("div", { class: "form" },
        ed?.url && h("img", { class: "previa", src: ed.url, alt: ed.alt || "Imagem atual" }),
        h("label", { class: "area", for: "item-arquivo" }, "🖼", nomeArq, arquivo),
        h("label", { class: "campo" }, "Descrição da imagem", alt),
        ed?.url && h("label", { class: "linha-marca" }, remover, "Remover a imagem atual")),
      cfg.ordem && h("label", { class: "campo" }, "Ordem de exibição (menor número aparece primeiro)", ordem),
      h("label", { class: "linha-marca" }, published, "Publicar no site"),
      h("div", { class: "botoes" }, h("button", { class: "btn", type: "submit", disabled: state.busy }, state.busy ? "Salvando..." : "Salvar"),
        ed && h("button", { class: "btn contorno", type: "button", onclick: () => { state.editing = null; render(); } }, "Cancelar")));
    const items = list.length === 0 ? h("div", { class: "vazio" }, "Nada cadastrado ainda. Enquanto estiver vazio, a seção não aparece no site.") : list.map((r) =>
      h("article", { class: "item" + (r.url ? " com-miniatura" : "") },
        r.url && h("img", { class: "miniatura", src: r.url, alt: "" }),
        h("div", {}, h("span", { class: "selo " + (r.published === 0 ? "rasc" : "pub") }, r.published === 0 ? "Rascunho" : "Publicado"),
          h("h3", {}, cfg.titulo(r)), cfg.meta(r) && h("p", { class: "meta" }, cfg.meta(r)), cfg.texto(r) && h("p", { class: "texto" }, cfg.texto(r)),
          h("div", { class: "botoes" },
            h("button", { class: "btn amarelo pequeno", onclick: () => { state.editing = r; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } }, "Editar"),
            h("button", { class: "btn perigo pequeno", disabled: state.busy, onclick: () => {
              if (!confirm("Deseja realmente excluir? Essa ação não pode ser desfeita.")) return;
              run(async () => { await api("/api/admin/items", { method: "DELETE", body: { table: cfg.table, id: r.id } }); await loadItems(); }, "Removido.");
            } }, "Excluir")))));
    return h("div", { class: "form", style: "gap:24px" },
      h("p", { class: "dica", style: "max-width:70ch" }, cfg.intro),
      tab === "i-news" && viewFestaFoto(),
      h("div", { class: "duas-colunas" }, form, h("div", { class: "lista" }, h("h2", { class: "titulo-lista" }, cfg.plural + " ", h("small", {}, `(${list.length})`)), items)));
  }

  function render() {
    if (!state.me) return;
    const views = { overview: viewOverview, projects: () => viewRecords("projects"), events: () => viewRecords("events"), photos: viewPhotos, volunteers: viewVolunteers, settings: viewSettings, team: viewTeam, account: viewAccount };
    if (state.tab.startsWith("i-") && itemViews[state.tab]) return shell(viewItems(state.tab));
    shell((views[state.tab] || viewOverview)());
  }

  async function start() {
    try {
      state.me = await api("/api/admin/me");
    } catch { return renderLogin(); }
    state.tab = "overview"; state.ok = ""; state.err = "";
    try { await loadData(); } catch (e) { state.err = e.message; }
    render();
    loadVolunteers().then(render, () => {});
  }
  start();
})();
