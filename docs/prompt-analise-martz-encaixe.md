# Prompt — Análise completa da Martz e encaixe no CRM Vitorine

> **Como usar**
>
> 1. No Chrome do seu Mac, instale a extensão **Claude** e entre com a sua conta.
> 2. Deixe `painel.martz.com.br` aberto e logado.
> 3. No Terminal, entre na pasta local do projeto e rode `claude --chrome`.
> 4. Cole tudo o que está abaixo da linha.
>
> O agente abre o navegador sozinho e navega pelo painel usando a sua sessão.
> Ele **não digita senha**: se cair na tela de login, ele para e pede para você
> entrar. O código do CRM é lido **no servidor, por SSH, só em leitura**.

---

## PAPEL

Você é um arquiteto de software sênior especializado em CRM de retenção para
e-commerce, WhatsApp (API Oficial da Meta e Evolution API) e integrações com
Shopify e Yampi. Sua tarefa é **abrir o navegador, analisar por dentro tudo o que
a Martz CRM tem** e **encaixar no sistema que já estamos construindo**, sem
quebrar o que já funciona.

## DOCUMENTOS DE REFERÊNCIA (leia os três inteiros antes de começar)

Estão no GitHub, repositório `VitorineEcomBr/ecom`, branch
`claude/inspiring-tesla-ax7voi`, pasta `docs/`. Se não estiverem na pasta
local, baixe de lá.

1. `docs/estado-atual-crm-vitorine.md` — **o que já existe**, medido no servidor
   em 28/09/2026. É a verdade sobre o nosso sistema.
2. `docs/auditoria-martz-e-especificacao-crm.md` — auditoria v3 da Martz (118
   artigos da central de ajuda), com o encaixe preliminar na seção 5.
3. `OPERACAO.md` (no servidor, em `/opt/grupo-vip`) — manual de operação.

## CONTEXTO DO PROJETO (resumo; o detalhe está no documento 1)

- **Loja:** Vitorine, calçados masculinos em couro, operação de uma pessoa só.
- **Produto:** CRM de disparo por WhatsApp, auto-hospedado, com **marca branca**.
  A intenção é **vender como produto**, com uma instalação por cliente.
- **Stack:** Node 22 · Fastify 5 · TypeScript strict · HTMX (sem build de front)
  · **SQLite** (better-sqlite3, WAL) · Evolution API (Baileys).
- **Infra:** VPS Contabo Europa (ambiente de teste) → **Hostinger São Paulo**
  planejado para produção. Docker Compose em `/opt/grupo-vip`. **Caddy com HTTPS**
  em `https://painel.vitorine.com.br`, DNS na Cloudflare.
- **Código:** 71 arquivos, 13.158 linhas, em `/opt/grupo-vip/app/src/`,
  **sem git**.
- **Acesso ao servidor:** `ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes root@84.247.132.123`.
- **Duas metades no mesmo painel e no mesmo banco:**
  - **Gerenciador de grupos** — em produção.
  - **Automações (CRM)** — motor de fluxos (gatilho + passos) disparado por
    evento da Yampi, **em modo teste**, funcionando de ponta a ponta. Um fluxo
    montado: carrinho abandonado (fluxo 15).
- **Integrações de e-commerce:** Yampi (funcionando, em testes) e Shopify
  (a fazer).
- **WhatsApp:** hoje só o **não oficial** (Evolution, instância `vitorine`).
  Vamos ter também o **Oficial** (Meta Cloud API).
- **IA:** o **Claude** faz o papel do "Martin" da Martz, em análise, redação,
  atendimento e prompts de imagem. As imagens são geradas por um modelo de
  imagem à parte.

## O QUE JÁ ESTÁ PRONTO E NÃO PODE QUEBRAR

### 1. Gerenciador de Grupos VIP — em produção, MANTER COMO ESTÁ

O CRM se conecta a ele, nunca o reescreve. Tudo abaixo é intocável:
- disparo em partes (texto, imagem, vídeo, GIF, áudio, bolinha, documento,
  carrossel até 10 cards), botões, agendamento, histórico, reenvio por destino;
- sincronização de grupos, com grupo novo entrando **bloqueado**;
- regras de formato: carrossel nunca na parte 1, botão com mídia só em imagem,
  áudio perde a menção;
- ritmo: intervalo entre grupos (60–120s hoje) e entre partes (2s), por número;
  janela, teto diário, retry;
- webhook da Evolution com status real de entrega;
- backup diário às 04:00 com WAL aplicado.

### 2. Integração com a Yampi — funcionando, EM TESTES

- 7 gatilhos, HMAC sobre o corpo cru, varredura de carrinhos a cada 5 min,
  **cálculo de preço fiel ao checkout** (campanha de kit + cupom, conferido em
  23 de 23 pedidos), identidade do carrinho por conteúdo.
- **Não reescrever.** Primeiro confirmar o que ela já faz; depois propor só
  complementos, como ajustes aditivos.
- Todo ajuste proposto precisa dizer **o impacto nos testes em andamento**.
- Os "fatos da API medidos na prática" do documento 1, seção 7, são verdades
  conquistadas. Não contradiga sem prova.

### 3. Travas de segurança que continuam valendo

- `#01` e `#02 Vitorine` **não recebem disparo sem ordem explícita**.
- Os 21 grupos de marca de terceiros **jamais** recebem.
- Teste vai só para `ENVIO TESTE GRUPO VIP`, a comunidade de teste e o
  `TELEFONE_TESTE`.
- Um fluxo **não sai de teste para produção sem ordem explícita**.
- A configuração ao vivo da Yampi é **somente leitura**.
- O número pessoal do Gabriel **não é pareado** como instância.

## REGRAS DE SEGURANÇA DESTA TAREFA

1. **Esta tarefa é só de análise e planejamento.** Não altere código, banco,
   `.env`, `docker-compose.yml`, `Caddyfile` nem nada no servidor. Não faça
   deploy, build nem commit. Não ligue, desligue nem edite fluxos.
2. **No navegador, na Martz, somente leitura:**
   - Não clique em Salvar, Criar, Enviar, Disparar, Ativar, Pausar, Publicar,
     Excluir, Duplicar, Clonar, Conectar, Desconectar, Sincronizar, Importar,
     Pagar nem "Enviar mensagem de teste".
   - Pode abrir abas, formulários, assistentes e modais para ver o que existe,
     e depois feche com Cancelar, Voltar ou X.
   - Se um assistente pedir para salvar para avançar de etapa, **não salve**:
     anote "etapa bloqueada sem salvar" e siga para a próxima tela.
   - Na dúvida se uma ação muda algo, **não faça**: anote "não testado".
   - Não copie dados pessoais de clientes (nome, telefone, e-mail, CPF). Só
     números agregados.
   - **Nunca digite senha.** Se aparecer a tela de login ou um pedido de código
     de verificação, pare e me chame.
   - Não abra links que saiam da Martz (Meta Business, Shopify, Yampi), exceto
     para ler uma página de documentação.
3. **No servidor, só leitura:** `ls`, `cat`, `grep`, `wc`, `docker compose ps`,
   `docker compose logs --tail`, e `sqlite3` com `.schema`, `SELECT count(*)` e
   `SELECT` sem dados pessoais. Nunca:
   - `docker compose down -v`, `restart`, `build` ou `up`;
   - `cp` do `app.db` (leva um banco atrasado; o backup usa `snapshot.cjs`);
   - chamar a API da Evolution ou da Yampi;
   - ler ou imprimir o valor de segredos do `.env` ou da tabela `ajustes`
     (`yampi_chave`, `yampi_token`, `yampi_segredo`). Liste só os nomes.
4. Se precisar de algo fora dessas regras, **pare e pergunte**.
5. **Salve o progresso a cada seção concluída.** Se a sessão for interrompida,
   retome da última seção salva, sem refazer o que já está pronto.

---

## FASE 0 — Preparação e abertura do navegador

1. Leia os três documentos de referência.
2. Liste os itens da auditoria marcados **[conferir no painel]**. Eles são
   prioridade na Fase 1.
3. **Abra o navegador:**
   - Use as ferramentas do Chrome para abrir uma aba nova em
     `https://painel.martz.com.br/dashboards`.
   - Confirme que o painel carregou logado. Se aparecer a tela de login, pare e
     me avise.
   - Feche pop-ups de novidades e o chat de suporte, se atrapalharem a navegação.
   - Faça uma captura de tela da página inicial e descreva o **menu lateral
     completo** antes de começar.

## FASE 1 — Varredura da Martz por dentro (navegador, somente leitura)

Percorra **todos** os itens do menu lateral, na ordem em que aparecem, e todos os
submenus. Depois percorra o menu do usuário, no canto superior direito
(Configurações e todas as suas seções). Por último, o Painel do Vendedor
(`vendedor.martz.com.br`), se houver acesso sem digitar senha.

Em cada tela:
- faça uma captura de tela;
- abra todas as abas, filtros, botões de "novo", assistentes, menus de três
  pontos e modais. Só olhe e depois feche;
- passe o mouse sobre os ícones de "?" para ler os textos de ajuda;
- role a página até o fim.

**Registre cada tela neste formato:**

```
### [Caminho no menu] > [Tela]
- URL:
- Objetivo (1 linha):
- Indicadores/gráficos (nome da métrica, período, comparativo):
- Filtros e ordenação:
- Colunas de listas/tabelas:
- Botões e ações (marque "não testado" nos que alteram dados):
- Formulários — campo | tipo | opções | padrão | obrigatório | texto de ajuda:
- Etapas/abas (se for assistente, detalhe cada etapa):
- Variáveis de personalização disponíveis:
- Regras, limites e avisos exibidos:
- Diferença em relação à auditoria (novo / diferente / confirmado):
- Equivalente no nosso sistema (tela/rota/tabela, ou "não existe"):
```

**Detalhe máximo obrigatório em:**

1. **Itens [conferir no painel] da auditoria:**
   - **geração de imagem com IA** no editor de e-mail: onde fica, o que pede,
     estilos, tamanhos, limites e custo;
   - a opção **"IA Personalizada"** nas ações de campanha: o que pede e o que
     entrega. Abra o seletor e leia, mas **não gere**;
   - qualquer **análise com IA** nos indicadores ou dashboards;
   - a **lista completa de predefinições de texto** de cada tipo de campanha
     (copie os textos);
   - a tela do **número não oficial**: limite diário, intervalo entre mensagens,
     status, reconexão;
   - qualquer menção às fases de estratégia 2, 4, 5, 6, 7 e 8.
2. **Criar campanha:** clique em "Nova campanha" e abra o assistente de **cada um
   dos 15 tipos** e da Campanha de Vendedores. Documente os 7 passos: todos os
   parâmetros de gatilho, todas as condições de disparo, todos os campos do Bônus
   e todas as opções avançadas da ação. **Saia sem criar e sem salvar rascunho.**
   Para cada tipo, diga qual gatilho nosso corresponde (`yampi.cart.reminder`,
   `yampi.order.paid` etc.) ou "não existe".
3. **Campanhas existentes:** abra as de exemplo, se houver, nas abas de
   resultados e de atividades. Anote a estrutura das telas, não os dados de
   clientes.
4. **Grupos de clientes:** abra "Criar novo grupo", depois "Adicionar filtro".
   Confirme as 29 categorias e os 119 filtros e anote os que não estiverem na
   auditoria. Saia sem criar.
5. **Indicadores:** cada visão, cada métrica, cada filtro de período e o criador
   de dashboards.
6. **WhatsApp:**
   - Telefones Oficiais: dados mostrados, qualidade, limite, métodos de pagamento;
   - Modelos de Mensagem: abra "Criar novo modelo" e percorra os 6 formatos, com
     campos e validações, **sem enviar para aprovação**;
   - número não oficial.
7. **Modelos de e-mail:** abra o editor de um modelo pré-definido e documente os
   blocos, as categorias, o Kit da marca, o bloco de produtos dinâmico e o
   recurso de imagem com IA. Saia sem salvar.
8. **Pop-ups e Pesquisas:** abra o editor de novo pop-up (as 7 seções) e o de
   nova pesquisa (tipos de pergunta). Saia sem salvar.
9. **Atendimento e Martin:** a inbox e todas as telas de configuração dos agentes,
   com campos, valores padrão e textos de ajuda.
10. **Integrações:** a lista completa e as telas da Yampi e da Shopify, mostrando
    o que pedem e quais status aparecem. **Não clique em Integrar.**
11. **Configurações:** todas as seções, inclusive usuários, funções e
    permissões, chaves de acesso, Tag Manager, remetente de e-mail, supressões,
    vendedores, unidades e carteira de créditos.

**No fim da fase entregue:**
- a árvore completa do menu;
- as telas que não conseguiu abrir e o motivo;
- as ações que deixou de testar por segurança.

## FASE 2 — Conferência do nosso sistema (SSH, somente leitura)

O documento 1 já descreve o sistema. **Não refaça o levantamento: confira e
complete.**

1. **Confira** se o documento 1 ainda bate com o servidor: contagem de tabelas,
   ajustes (só os nomes das chaves sensíveis), rotas, fluxos. Registre as
   diferenças.
2. **Leia o código que importa para o encaixe** e descreva como funciona hoje:
   - `auto/motor.ts` — como os passos são agendados e executados, como uma
     condição encerra, onde entraria o grafo e a expiração da atividade;
   - `auto/extrator.ts` — de onde vem cada variável; onde entraria recalcular
     no envio;
   - `envio.ts` — onde entraria uma **camada de canais** (Evolution, Meta
     Oficial, e-mail) sem mudar o comportamento do Grupo VIP;
   - `db/schema.sql` e `db/conexao.ts` — como as migrações são feitas;
   - `painel/construtor.ts` — como os tipos de parte são definidos;
   - o tratamento do webhook da Yampi: o que é guardado de cada evento e o que
     é descartado.
3. **Grupo VIP:** mapeie módulos, tabelas e fluxos de disparo. Marque cada peça
   como **"congelada"**.
4. **Yampi:** confirme o que já faz e liste o que falta para montar uma **base de
   clientes e pedidos** (backfill em fatias diárias, deduplicação, `cart_token`).
   Veja os logs das últimas 24–72h, só leitura, e anote falhas.
5. **Pontos de extensão:** onde cada módulo novo entra **ao lado** do que existe.

## FASE 3 — Matriz de encaixe (Martz × nosso sistema)

Parta da seção 5 da auditoria (encaixe preliminar) e complete com a Fase 1 e a
Fase 2. Para **cada funcionalidade da Martz**, preencha:

| Funcionalidade Martz | Nosso equivalente hoje (tela/rota/tabela) | Estado (pronto / parcial / não existe / não se aplica) | O que falta | Arquivos afetados | Risco para o Grupo VIP | Risco para a integração Yampi | Esforço (P/M/G) | Prioridade (P0–P3) | Como fazer melhor que a Martz |
|---|---|---|---|---|---|---|---|---|---|

**Cobertura mínima:**
- os 15 tipos de campanha × os nossos gatilhos e fluxos;
- recursos da ação: condições de disparo, entrada (uma vez / infinitas /
  máximo / intervalo), janela, dias da semana, limite de atraso, limite diário,
  semi-automático, público incluir/excluir, filtros do gatilho;
- atividades e os 11 status × `execucoes` / `execucao_passos` / `entregas`;
- **base de clientes e pedidos** (a maior lacuna), deduplicação, atributos;
- RFM e grupos de clientes (filtros E/OU/NÃO);
- WhatsApp Oficial (templates em 6 formatos, mapeamento de variáveis,
  sincronização, erros da Meta, limite de 2 mensagens de marketing por pessoa
  em 24h) e Não Oficial 1:1;
- variáveis Martz × as nossas (rastreio, Pix, link de pagamento, pesquisa, UTM);
- bônus × **cashback nativo da Yampi**;
- indicadores (5 visões), resultado por campanha, atribuição direta
  (`cart_token`) e em 48h, UTMs;
- e-mail (editor, kit da marca, domínio, supressões, imagem com IA);
- pop-up, pesquisas e a campanha Avaliação;
- atendimento (inbox, setores, macros);
- IA (Martin → agentes com Claude);
- colaboradores e funções (necessário para vender);
- Tag Manager e Analytics do site;
- Integração Shopify.

**Diferenciais que obrigatoriamente entram no plano:**
1. **Grupos VIP ligados ao CRM:** filtro "está / não está no VIP", convite
   automático para Campeões, receita do grupo com cupom exclusivo. Sempre lendo
   o VIP, nunca alterando o motor dele.
2. **Motor em grafo** (a Martz não ramifica).
3. **Variáveis recalculadas na hora do envio** (a Martz avalia só na entrada).
4. Espera em segundos e encerramento por evento (já temos; manter).
5. **Atribuição direta** por `cart_token`, além da janela de 48h.
6. **Grupo de controle** para medir a receita que o fluxo realmente adiciona.
7. **Contagem de mensagens de marketing por cliente** antes de enviar pelo Oficial.
8. **Analista com Claude:** relatório semanal e perguntas em linguagem natural.
9. **Marca branca** (a Martz não tem) mantida em todas as telas novas.

## FASE 4 — Arquitetura de encaixe (incremental, sem reescrever)

1. **Manter a stack atual** (Fastify + TypeScript + HTMX + SQLite). Justifique
   com números se algo exigir mudar. Postgres só entra se a decisão for SaaS
   multi-loja; com uma instalação por cliente, avalie se o SQLite basta.
2. **Modelo de dados:** tabelas novas e colunas novas (**só adicionar**), no
   padrão de migração de `db/conexao.ts`, com o impacto nos testes da Yampi.
3. **Motor:** como sair do linear para o grafo migrando o fluxo 15 sem mudar o
   comportamento; onde entram expiração, dias da semana e semi-automático.
4. **Camada de canais** em `envio.ts`: Evolution (atual), Meta Oficial, e-mail.
5. **WhatsApp Oficial:** WABA do próprio cliente com token de usuário de sistema
   (uma instalação por cliente, sem virar Tech Provider); número dedicado que
   **não seja** o Sac Vitorine; webhooks de status e qualidade.
6. **Operação:** git, backup fora da VPS, teste de restauração num servidor
   limpo junto com a migração para a Hostinger SP.

## FASE 5 — Roteiro de construção

Parta da seção 10 da auditoria e ajuste com o que as Fases 1 a 4 mostrarem.
Divida em fases de 1 a 2 semanas. Em cada fase informe:
- entregas;
- **critério de aceite testável**;
- arquivos e módulos afetados;
- o que **não** será tocado;
- como testar sem disparar para clientes reais (`TELEFONE_TESTE`, grupo de
  teste, modo teste do fluxo);
- plano de volta atrás.

**Ordem-base:**
0. Base segura: git, backup fora da VPS, remover rotas legadas, corrigir `BLOCOS`.
1. Carrinho em produção: variáveis no envio, limite de atraso, dias da semana,
   janela e esperas de produção. **Sair do teste só com a minha ordem.**
2. Base de dados da loja: clientes, pedidos, backfill Yampi, `cart_token`.
3. Fluxos transacionais: Pix/pagamento recusado, status + rastreio, pós-compra,
   cashback vencendo; tela única de Atividades.
4. Motor em grafo.
5. Segmentação: RFM, grupos de clientes, gatilhos por tempo, filtro VIP.
6. Indicadores e atribuição.
7. WhatsApp Oficial.
8. Claude (Redator, Analista, Revisor de template, Diretor de arte).
9. E-mail.
10. Shopify, pop-up e pesquisas.
11. Produto: instalador, colaboradores com funções, migração para Hostinger SP.

## ENTREGÁVEIS

Salve tudo em `docs/analise-martz/`:

1. `01-varredura-martz.md` — Fase 1 completa, tela a tela.
2. `02-conferencia-sistema-atual.md` — Fase 2: diferenças em relação ao
   documento 1 e como o código funciona nos pontos de encaixe.
3. `03-matriz-de-encaixe.md` — Fase 3.
4. `04-arquitetura-de-encaixe.md` — Fase 4, com diagrama e modelo de dados.
5. `05-roteiro.md` — Fase 5.
6. `00-resumo-executivo.md` — no máximo 1 página:
   - o que a Martz tem que ainda não temos;
   - onde já estamos à frente;
   - as decisões que preciso tomar;
   - o primeiro passo recomendado.

Ao terminar, me mostre o resumo executivo e pergunte se pode seguir para a
implementação da Fase 0. **Não implemente nada antes da minha aprovação.**
