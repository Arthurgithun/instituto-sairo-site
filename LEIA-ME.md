# Instituto Sairó – site e painel na Netlify

Esta pasta tem **tudo**: o site, a página de voluntários e o painel administrativo (`/admin`), que funciona sem o ChatGPT.
Os dados do painel (projetos, agenda, fotos, informações, voluntários e equipe) ficam guardados na própria Netlify e **não se perdem** quando você publica o site de novo.

## 1. Publicar pela primeira vez

1. **Descompacte** o arquivo `.zip`. Vai aparecer a pasta `instituto-sairo-netlify`.
2. Entre em **app.netlify.com**, vá em **Add new project → Deploy manually** (ou use a página *Netlify Drop*) e **arraste a pasta inteira** `instituto-sairo-netlify` (a que tem o arquivo `netlify.toml` dentro). Espere terminar.
3. Abra o endereço que a Netlify mostrar e confira o site.
4. **Teste se o painel “por trás” foi ativado:** abra `SEU-ENDERECO/api/content`. Se aparecer algo como `{"projects":[],"events":[],...}`, está certo. Se aparecer “Page not found”, veja o item 6 abaixo.

## 2. Criar o acesso ao painel (obrigatório, uma vez)

No site da Netlify: **Project configuration → Environment variables → Add a variable**. Crie estas três:

| Nome | O que colocar |
|---|---|
| `ADMIN_EMAIL` | o seu e-mail (será o login do responsável principal) |
| `ADMIN_PASSWORD` | uma senha forte, com 12 caracteres ou mais |
| `SESSION_SECRET` | uma frase longa e aleatória, com 32 caracteres ou mais (pode digitar qualquer coisa comprida; ninguém precisa decorar) |

Marque como **segredo** (*contains secret values*) a senha e a frase, se a Netlify oferecer.

**Depois de criar as variáveis, arraste a pasta de novo** (publique mais uma vez). As variáveis só valem a partir da próxima publicação.

## 3. Entrar no painel

Abra `SEU-ENDERECO/admin`, entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

- **Projetos, Agenda, Galeria e Informações:** funcionam como no painel antigo e aparecem no site na hora.
- **Voluntários:** lista de quem se cadastrou em `SEU-ENDERECO/voluntarios`. Dá para marcar como contatado, excluir e baixar a planilha (CSV).
- **Equipe:** só o responsável principal vê. Adicione outras pessoas com e-mail e senha provisória; cada uma pode trocar a própria senha em “Minha senha”. Remover alguém tira o acesso na hora.

A senha do responsável principal só muda alterando `ADMIN_PASSWORD` na Netlify e publicando de novo.

## 4. Atualizar o site depois

Quando receber arquivos novos, substitua-os na pasta e **arraste a pasta de novo** no painel da Netlify. Os dados do painel continuam lá.

## 5. Cuidados com os dados dos voluntários

O painel guarda nome, WhatsApp, idade e cidade de pessoas, algumas menores de idade. Use só para chamar para as ações da Sairó, não compartilhe a planilha e apague os cadastros que não forem mais necessários.

## 6. Se algo não funcionar

| Sintoma | O que fazer |
|---|---|
| `/api/content` dá “Page not found” | A Netlify não ativou as funções nessa publicação. Tente arrastar a pasta de novo. Se continuar, publique por **GitHub** (conecte um repositório com esta pasta) ou pelo terminal com `npx netlify-cli deploy --prod`; qualquer uma das duas ativa as funções. |
| No painel: “falta a variável SESSION_SECRET” | Crie as variáveis do item 2 e publique de novo. |
| “E-mail ou senha incorretos” para o responsável | Confira `ADMIN_EMAIL` e `ADMIN_PASSWORD` na Netlify (e se publicou de novo depois de criar). |
| “Muitas tentativas” | Após 5 erros seguidos o login daquele e-mail trava por 15 minutos. Espere e tente de novo. |
| Foto não sobe | Use JPG, PNG, WebP ou GIF. Fotos grandes são reduzidas automaticamente antes do envio. |
| Cadastro de voluntário dá erro | Confirme que as funções estão ativas (item 1.4). |

## O que tem em cada pasta

- `public/` – o que as pessoas veem: `index.html` (site), `voluntarios.html`, `admin/` (painel), `assets/` (imagens e fontes).
- `netlify/functions/` e `netlify/lib/` – a parte que guarda e entrega os dados.
- `netlify.toml` e `package.json` – configuração da Netlify. Não apague.

## Seções novas do site (editadas pelo painel)

No painel, o grupo **Seções do site** edita: Números de impacto, Parceiros, Transparência, Quem faz a Sairó, Perguntas frequentes e Depoimentos. A aba **Novidades** publica notícias (com foto) e troca a foto do relato da Festa.

- Enquanto uma seção estiver **vazia**, ela **não aparece** no site (nem no menu). Nenhum número ou nome inventado vai ao ar.
- Para ver como o site fica com as seções preenchidas, abra `SEU-SITE.netlify.app/?exemplo=1`. Só você vê isso, com uma faixa avisando que são textos de exemplo.
- Transparência usa **links** (suba o PDF no Google Drive, deixe o acesso por link e cole o endereço no painel).
- A página `/privacidade.html` é um modelo básico de política de privacidade (LGPD). Peça para alguém de confiança revisar antes de divulgar.
