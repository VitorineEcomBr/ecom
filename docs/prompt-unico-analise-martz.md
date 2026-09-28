# PROMPT ÚNICO — Análise completa da Martz e encaixe no CRM Vitorine

Este prompt é autossuficiente: traz o contexto do nosso sistema, o resumo da
auditoria da Martz, as regras de segurança e o passo a passo. Não depende de
nenhum outro arquivo.

---

## 1. PAPEL E MISSÃO

Você é um arquiteto de software sênior especializado em CRM de retenção para
e-commerce, WhatsApp (API Oficial da Meta e Evolution API) e integrações com
Yampi e Shopify.

Sua missão tem duas partes:
1. **Abrir o navegador e analisar por dentro tudo o que a Martz CRM tem**
   (`https://painel.martz.com.br`), tela a tela, somente leitura.
2. **Encaixar cada funcionalidade no CRM que já estamos construindo**, sem
   quebrar o que já funciona, e entregar um plano de construção por fases.

Esta tarefa é **só de análise e planejamento**. Nada é implementado antes da
minha aprovação.

---

## 2. O NOSSO SISTEMA HOJE (medido no servidor em 28/09/2026)

### 2.1 O que é
CRM de disparo por WhatsApp, auto-hospedado, feito para a **Vitorine**
(calçados masculinos em couro, operação de uma pessoa só). Tem **marca branca**
(nome, logo, cor e fundo configuráveis) porque a intenção é **vender como
produto**, com **uma instalação por cliente**.

Duas metades no mesmo painel e no mesmo banco:
- **Gerenciador de grupos VIP** — em produção, usado todo dia.
- **Automações (CRM)** — fluxos disparados por evento da Yampi, **em modo
  teste**, funcionando de ponta a ponta.

### 2.2 Infraestrutura
- VPS **Contabo Europa** (ambiente de teste), 4 vCPU, 7,8 GB RAM, Ubuntu 24.04.
  Produção planejada na **Hostinger São Paulo**, pela latência.
- Pasta do projeto: `/opt/grupo-vip`. Docker Compose com 4 contêineres:
  `gv-app` (nosso sistema, porta 127.0.0.1:3000), `gv-evolution`
  (Evolution API **2.4.0-rc2**), `gv-postgres` e `gv-redis` (os dois só para a
  Evolution; o app **não** usa Postgres).
- **Caddy no host** com HTTPS (Let's Encrypt) em `https://painel.vitorine.com.br`,
  DNS na Cloudflare. Portas abertas: só 22, 80 e 443.
- Acesso: `ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes root@84.247.132.123`
  (só chave).

### 2.3 Stack e código
- Node 22 · **Fastify 5** · **TypeScript strict** · HTML no servidor + **HTMX**
  (sem build de front) · **SQLite** (better-sqlite3, modo WAL) · Evolution API
  com Baileys.
- 71 arquivos, 13.158 linhas, em `/opt/grupo-vip/app/src/`. **Não há git.**
- Arquivos centrais: `auto/motor.ts` (motor dos fluxos), `auto/extrator.ts`
  (variáveis a partir do payload da Yampi), `envio.ts` (envio para a Evolution),
  `painel/construtor.ts` (construtor de mensagem em canvas), `painel/rotas.ts`
  (grupos), `painel/rotasAuto.ts` (automações), `db/schema.sql`,
  `db/conexao.ts` (migrações), `regras/` (janela, teto, intervalo, retry).
- Banco em `/opt/grupo-vip/dados/app.db`. Tabelas: ajustes, botoes, cards,
  codigos, destinos, disparos, dispositivos, entregas, eventos (auditoria),
  eventos_recebidos (webhooks), execucao_passos, execucoes, fluxos,
  grupo_instancia, grupos, instancias, modelos, partes, passos, rastreios
  (vazia), sessoes, skus_campanha, telefones, usuarios.
- **Não existe tabela de clientes nem de pedidos.** O sistema reage aos eventos,
  mas não guarda uma base da loja.

### 2.4 Painel
- Topo: Instâncias · Personalização · Integrações · Sair.
- **Automações:** Fluxos (com mapa visual e construtor de mensagem).
- **Gerenciador de grupos:** Novo disparo · Mensagens · Agendamento · Disparos
  (histórico) · Grupos · Comunidades.
- Login por e-mail com código em aparelho novo. 1 usuário.
- 75 rotas, das quais ~15 são legadas e deveriam ser removidas.

### 2.5 Automações
- **Gatilhos da Yampi:** `cart.reminder` (carrinho abandonado), `order.created`,
  `order.paid`, `order.status.updated`, `order.updated`,
  `transaction.payment.refused`, `cashback.expiring`.
- **Tipos de passo:** mensagem · esperar (em **segundos**) · condição · consulta
  (chamada HTTP). Operadores: eq, ne, contem, maior, menor, existe, vazio.
- **Motor linear:** uma condição só continua ou encerra, **não ramifica**. Virar
  **grafo** é o próximo passo de arquitetura já acordado.
- Identidade do carrinho por conteúdo (`carrinho:<token>#<hash>`): o cliente que
  muda o carrinho recebe de novo, sem duplicar.
- `uma_por_cliente`, quarentena por reentrada, janela de horário por passo, teto
  diário, intervalo entre partes, retry.
- O fluxo **encerra quando chega** `order.paid`.
- **Modo teste:** manda tudo para o `TELEFONE_TESTE`, com as mesmas regras.
- **Variáveis:** cliente (`{{nome}}`, `{{nome_completo}}`, `{{email}}`,
  `{{telefone}}`); carrinho (`{{resumo}}` com produtos, preço riscado, cupom,
  frete e total; `{{itens}}`, `{{primeiro_produto}}`, `{{valor_reais}}`,
  `{{link}}`, `{{cupom}}` e outras); pedido (`{{pedido}}`,
  `{{forma_pagamento}}`, `{{status}}`); cashback (`{{cashback_valor_reais}}`,
  `{{cashback_expira_em_br}}`, `{{cashback_dias}}`, `{{cashback_saldo}}`).
- **Construtor:** canvas estilo Reportana, com prévia; tipos de parte: texto,
  imagem, vídeo, áudio, bolinha, gif, documento, carrossel e **produtos** (fotos
  e preços dos itens).
- **Único fluxo montado:** fluxo 15, carrinho abandonado, em teste: mensagem →
  espera 180s → mensagem → espera 300s → mensagem; encerra em `order.paid`.
  No fim de semana: 56 entregas aceitas, zero falha.

### 2.6 Integração com a Yampi (funcionando, em testes)
- Loja `vitorine3`. Webhook com **HMAC sobre o corpo cru**. Varredura da API de
  carrinhos a cada 5 min, com botão "buscar agora".
- **Cálculo de preço fiel ao checkout**, conferido em 23 de 23 pedidos:
  produtos → campanha de kit (30% da unidade mais barata por par elegível) →
  cupom (valor ou percentual; se não acumula, substitui a campanha) → total =
  produtos − desconto + frete. Os 5% do Pix ficam de fora de propósito.
- **Fatos da API medidos na prática (não contradiga sem prova):** filtro por
  `updated_at` é ignorado; a lista de carrinhos não traz cupom (só o GET
  individual); `totalizers.discount` vem sempre 0 em carrinho abandonado; a API
  demora ~16 min para refletir edições; `cart.reminder` chega 11–29 min após a
  **criação** do carrinho.

### 2.7 Grupos e travas de segurança
- Instância única `vitorine` ("Sac Vitorine"). O sistema aceita várias; cada
  grupo dispara pelo número dele.
- Grupos: `#01 Vitorine ⚡️` (comunidade, 251), `#02 Vitorine ⚡️` (grupo, 83),
  e dois de teste (`TESTE NOVA COMUNIDADE`, `ENVIO TESTE GRUPO VIP`). O "pai" de
  comunidade nunca recebe.

### 2.8 Backup
Diário às 04:00, 14 gerações, no mesmo disco: dump da Evolution, sessão do
WhatsApp, `app.db` com WAL aplicado (via `snapshot.cjs`), mídias, marca, `.env`
e compose. **A restauração nunca foi testada num servidor limpo**, e restaurar
pode reenviar disparo.

### 2.9 O que já está na nossa lista de pendências
Motor em grafo · canal de e-mail · colocar o código em git · corrigir a
dependência invertida de `BLOCOS` (deve morar em `construtor.ts`) · remover
rotas legadas · **recalcular as variáveis do carrinho na hora do envio** ·
rastreio (`track_code`/`track_url`, página pública, Frenet) · Pix copia-e-cola ·
casar pedido com carrinho por `cart_token` · webhook de tag da Shopify · fluxos
de pagamento recusado, pós-compra, recompra e cashback vencendo · instalador por
cliente · testar restauração de backup · migrar para Hostinger SP.

---

## 3. O QUE NÃO PODE QUEBRAR

### 3.1 Gerenciador de Grupos VIP — MANTER COMO ESTÁ
O CRM se conecta a ele e lê os dados dele. **Nunca reescreve.** São intocáveis:
disparo em partes, botões, carrossel, agendamento, histórico, reenvio,
sincronização (grupo novo entra bloqueado), ritmo por número (60–120s entre
grupos, 2s entre partes), janela, teto, retry, webhook de status da Evolution e
as regras de formato (carrossel nunca na parte 1; botão com mídia só em imagem;
áudio perde a menção).

### 3.2 Integração com a Yampi — em testes, NÃO REESCREVER
Primeiro confirmar o que ela faz; depois propor só complementos aditivos, sempre
dizendo o impacto nos testes em andamento.

### 3.3 Travas que continuam valendo
- `#01` e `#02 Vitorine` **não recebem disparo sem ordem explícita**.
- Os 21 grupos de marca de terceiros **jamais** recebem.
- Teste vai só para os grupos de teste e o `TELEFONE_TESTE`.
- Nenhum fluxo sai de teste para produção sem ordem explícita.
- A configuração ao vivo da Yampi é somente leitura.
- O número pessoal do Gabriel não é pareado como instância.

---

## 4. REGRAS DE SEGURANÇA DESTA TAREFA

1. **Só análise.** Não altere código, banco, `.env`, `docker-compose.yml` nem
   `Caddyfile`. Não faça build, deploy nem commit. Não ligue, desligue nem edite
   fluxos ou disparos.
2. **Na Martz, só leitura:**
   - Não clique em Salvar, Criar, Enviar, Disparar, Ativar, Pausar, Publicar,
     Excluir, Duplicar, Clonar, Conectar, Desconectar, Sincronizar, Importar,
     Integrar, Pagar nem "Enviar mensagem de teste".
   - Pode abrir abas, formulários, assistentes e modais para ver o que existe e
     depois fechar com Cancelar, Voltar ou X.
   - Se um assistente exigir salvar para avançar, **não salve**: anote "etapa
     bloqueada sem salvar" e siga.
   - Na dúvida, **não faça**: anote "não testado".
   - Não copie dados pessoais de clientes. Só números agregados.
   - **Nunca digite senha.** Tela de login ou código de verificação: pare e me
     chame.
   - Não abra links fora da Martz, exceto páginas de documentação.
3. **No servidor, só leitura:** `ls`, `cat`, `grep`, `wc`, `docker compose ps`,
   `docker compose logs --tail`, `sqlite3` com `.schema`, `SELECT count(*)` e
   `SELECT` sem dados pessoais. Proibido: `docker compose down -v`, `restart`,
   `build`, `up`; `cp` do `app.db`; chamar a API da Evolution ou da Yampi; ler ou
   imprimir segredos do `.env` ou das chaves `yampi_chave`, `yampi_token`,
   `yampi_segredo` (liste só os nomes).
4. Precisou de algo fora disso: **pare e pergunte**.
5. **Salve o progresso a cada seção concluída.** Se a sessão cair, retome da
   última seção salva.

---

## 5. O QUE JÁ SABEMOS DA MARTZ (auditoria da central de ajuda, 118 artigos)

Use como checklist. Na varredura, **confirme, corrija e complete**. Os itens
marcados **[CONFERIR]** não estão documentados e são prioridade.

### 5.1 Mapa de menus
- **Indicadores:** dashboards montáveis (modelos: Vendas, Recompra,
  Monitoramento de Campanhas); visões Geral, RFM, Vendas, Retenção (com coorte),
  Campanhas (com custo) e Clientes (com "saúde do cadastro" 0–10).
- **Analytics** do site (exige o Martz Tag Manager).
- **Clientes:** Clientes (com pedido) e Leads (sem pedido); Grupos de clientes;
  RFM; Importar planilha.
- **Campanhas:** Campanha da Loja (15 tipos) e Campanha de Vendedores.
- **Planejar → Pop-ups.** **Executar → Atividades.**
- **Modelos de email:** Meus modelos · Pré-definidos · Kit da marca · Meus arquivos.
- **Pesquisas.** **Atendimento** (inbox + Martin). **Carteira** de créditos.
- **Configurações:** WhatsApp (Telefones Oficiais, Modelos de Mensagem, número
  não oficial por QR), Integrações, Chaves de acesso, Tag Manager, Remetente de
  e-mail, Supressões, Atendimento (Equipe, Setores, Tags, Configurações Gerais),
  Macros, Vendedores e Unidades, Gestão de Colaboradores, Tags.
- **Painel do Vendedor** separado (`vendedor.martz.com.br`).

### 5.2 Campanhas — os 15 tipos
Boas-Vindas (1ª compra) · Saudades (sem comprar há X dias) · Aniversariante do
Dia · Aniversariante do Mês · Status do Pedido · Pós-Venda · Resgate (Pix/boleto
pendente ou cancelado) · Recuperação de Pedidos · Carrinho Abandonado (X min) ·
Comunicação (disparo para grupos) · Aniversário da 1ª Compra · Comunicação com
Assinantes (pop-up) · Avaliação (respondeu pesquisa) · Lembrete de Bônus ·
Recuperação de Bônus (bônus expirado).

**Assistente em 7 passos:**
1. Parâmetros: nome; data de início (data no passado busca clientes antigos) e
   fim; entrada "uma vez / infinitas / máximo de N / intervalo de N horas";
   interruptor de aceite (LGPD); interruptor "cálculo preditivo".
2. Tipo. 3. Gatilho (Status do Pedido tem 22 filtros: status, valor, produtos,
   categorias, pagamento, estado, datas, canal, cupom, rastreio, 1ª compra,
   frete, vendedor). 4. Público (incluir e excluir grupos). 5. Bônus.
6. Pesquisa vinculada. 7. Ações.

**Cada ação:** canal (WhatsApp não oficial, WhatsApp Oficial, SMS, E-mail,
Chatbot); texto (predefinições por tipo, **"IA Personalizada"** ou customizado);
condição **D + N dias** + uma de: a partir da entrada · da data da compra · se o
pedido for pago · bônus usado · bônus não usado · realizou compra após entrar ·
não realizou compra após entrar · não pagou após entrar. **Só existe espera em
dias.** Modo automático ou **semi-automático** (fica pendente e alguém clica
"Enviar", que abre o WhatsApp). Opções avançadas: dias da semana, janela de
horário, **limite de atraso** (passou, não envia), **limite diário da ação**.
Pausar só a ação. Clonar, pausar, excluir campanha. Ao reativar, a campanha pega
os clientes do período pausado.

**Pontos fracos admitidos pela Martz:** avalia o cliente **só na entrada**; só
espera em dias; não ramifica.

### 5.3 Atividades
Status: a executar · aguardando envio · enviada · entregue · lida · não lida ·
completa · atrasada · contato inválido · falha · suprimida. Tela global e por
campanha, com "ver detalhes" mostrando o erro exato da Meta.

### 5.4 Clientes e segmentação
- Chave do cliente: **CPF/CNPJ** (mescla quem tem o mesmo documento).
- Grupos de clientes em tempo real ou estáticos, lógica **E / OU / NÃO**,
  contagem ao vivo. **29 categorias, 119 filtros**: recência, frequência, valor,
  RFM, ticket médio, tags, categoria, produto, desconto, frete, data do pedido,
  status, cadastro, pagamento, aniversário (inclui signo), localização,
  campanha (enviadas, lidas, falhas, engajadas), canal, newsletter, carrinho,
  atributos customizados, vendedor, pesquisa (promotor/detrator), documento,
  telefone, e-mail, integração, bônus, fidelidade.
- **RFM:** quintis, 11 segmentos (Campeões, Fiéis, Fiéis em potencial, Novos,
  Promessas, Precisam de atenção, Quase dormentes, Em risco, Não pode perder,
  Hibernando, Perdidos), recalculada 1x ao dia.

### 5.5 WhatsApp
- **Oficial:** conexão por "Continuar com o Facebook"; cobrança da Meta no cartão
  do lojista em USD; chip dedicado recomendado.
- **Templates, 6 formatos:** Texto · Mídia · Resposta Rápida (1–3 botões) ·
  Chamada para Ação (até 4: URL fixa, URL dinâmica, ligação, copiar cupom,
  descadastro) · Carrossel (2–10 cards) · Detalhes do Pedido/Pix. Cabeçalho ≤60
  com 1 variável; corpo ≤1.024; rodapé ≤60 sem variável. Variáveis numeradas
  `{{1}}` mapeadas para campos na ação. Botão "sincronizar modelos". Dicas para
  aprovar como Utilidade (sem perguntas, sem "aproveite", nome da loja no meio,
  sem emoji).
- **Não oficial:** QR Code; limite diário de segurança; para reconectar, exclui e
  lê QR novo.
- **Erros documentados:** 131049 (limite de marketing por destinatário, **máx.
  2 templates de marketing por pessoa em 24h**), 131026 (sem WhatsApp), 131042
  (pagamento), 132012 (template desatualizado), spam rate limit,
  re-engagement (janela de 24h fechada).

### 5.6 Bônus
Tipos: valor fixo, percentual, **cashback** (% da compra anterior) e frete
grátis. Campos: compra mínima, valor, teto, validade, **multiplicador de uso**,
intervalo entre bônus, limite no período. Interruptores: só 1ª compra,
cumulativo, só o próprio cliente, não gerar bônus em compra com bônus. Cupom
único criado na loja pela API. Ciclo: gera → lembrete → recuperação.

### 5.7 E-mail
Editor de arrastar blocos (abas Conteúdo, Blocos, Corpo, Imagens, Uploads,
Auditoria — provavelmente Unlayer), banco de fotos grátis, bloco dinâmico de
produtos do carrinho, **Kit da marca** (importa logo e cores pela URL), modelos
pré-definidos, domínio (SPF/DKIM/DMARC) ou remetente único, supressões
automáticas, R$ 0,01 por e-mail acima da cota. **[CONFERIR] geração de imagem
com IA no editor.**

### 5.8 Indicadores e atribuição
Receita geral e receita pela Martz, ticket, LTV, frequência, tempo entre
pedidos, curva ABC, retenção, coorte, custo por período. Atribuição **direta**
(usou bônus) e **indireta** (pedido pago até 48h após a mensagem, só com o
"cálculo preditivo" ligado). UTMs automáticas `utm_source=martz`.

### 5.9 Demais módulos
- **Pop-up:** 7 seções (informações com tag, campos, layout, imagem, sucesso,
  exibição, disparo por atraso/rolagem/inatividade/botão), script no site.
- **Pesquisas:** NPS, CSAT, texto; vinculadas a campanhas.
- **Atendimento:** equipe, setores com rodízio, tags, macros com `/`, horário e
  resposta automática, ficha do cliente com RFM e pedidos.
- **Martin (IA):** agente de **atendimento** pago à parte, só no WhatsApp
  Oficial. Coordenador + especialistas (base de conhecimento, catálogo,
  cross-sell, pedidos) + **juiz** que dá nota a cada resposta (abaixo de 0,70
  escala) + termômetro de frustração. Modos copiloto e autônomo (60s para
  desfazer). "Fonte da Verdade" no prompt. Nunca fala de estoque, nunca promete
  reembolso, CPF mascarado.
- **Vendedores:** carteiras por filtro, rodízio, painel próprio com tarefas.
- **[CONFERIR]:** o que a "IA Personalizada" faz; se há análise com IA nos
  indicadores; as predefinições de texto de cada tipo; a tela do número não
  oficial; as fases de estratégia não publicadas (2, 4, 5, 6, 7, 8).

---

## 6. ENCAIXE PRELIMINAR (hipóteses para você confirmar)

- **Os nossos Fluxos já são as Campanhas da Martz.** Estender, não recriar.
  - Pronto: Carrinho Abandonado.
  - Gatilho chega, falta o fluxo: Resgate/Pix (`payment.refused`,
    `order.created`), Status do Pedido, Pós-Venda (`order.paid`), Lembrete de
    Bônus (`cashback.expiring`, cashback nativo da Yampi).
  - Falta a base de clientes: Boas-Vindas, Saudades, aniversários, Comunicação
    segmentada.
  - Fase posterior: Assinantes (pop-up), Avaliação (pesquisas).
- **Já estamos à frente:** espera em segundos; encerramento por evento;
  preço fiel ao checkout; parte `produtos`; passo `consulta`; identidade do
  carrinho por conteúdo; marca branca; Grupos VIP.
- **Faltam nos passos:** dias da semana, limite de atraso, limite diário por
  fluxo, semi-automático, público incluir/excluir, filtros do gatilho, pausar
  passo, clonar fluxo, grafo.
- **Maior lacuna:** base de **clientes e pedidos** (backfill da Yampi em fatias
  diárias, deduplicação por CPF com telefone e e-mail de reserva, `cart_token`).
- **Stack:** manter Fastify + TypeScript + HTMX + SQLite. Postgres só se virar
  SaaS multi-loja. **Camada de canais** em `envio.ts` (Evolution, Meta Oficial,
  e-mail). WhatsApp Oficial com a WABA do próprio cliente e **chip novo** (o Sac
  Vitorine está na Evolution e pararia de funcionar nos grupos se migrasse).
- **Bônus:** usar o cashback nativo da Yampi agora.
- **IA com Claude:** Analista (relatório semanal e perguntas), Redator (partes da
  mensagem no tom da marca), Revisor de template Meta, Diretor de arte (prompt de
  imagem para um modelo de imagem à parte; o Claude não gera imagem), Segmentador
  e, depois, Atendente no modelo do Martin.

---

## 7. PASSO A PASSO

### FASE 0 — Abrir o navegador
1. Use as ferramentas do Chrome para abrir uma aba em
   `https://painel.martz.com.br/dashboards`.
2. Confirme que está logado. Se aparecer login, pare e me avise.
3. Feche pop-ups de novidades e o chat de suporte.
4. Faça uma captura da página inicial e descreva o **menu lateral completo**.

### FASE 1 — Varredura da Martz (somente leitura)
Percorra **todos** os itens do menu lateral e submenus, depois o menu do usuário
(Configurações inteiro) e, se houver acesso sem senha, o Painel do Vendedor. Em
cada tela: capture, abra todas as abas, filtros, botões de "novo", assistentes,
menus de três pontos e modais, leia os "?" de ajuda, role até o fim, feche sem
salvar.

Registre cada tela com: caminho no menu · URL · objetivo · indicadores e
gráficos · filtros e ordenação · colunas · botões (marque "não testado" nos que
alteram dados) · formulários (campo, tipo, opções, padrão, obrigatório, ajuda) ·
etapas · variáveis · limites e avisos · **diferença em relação à seção 5**
(novo / diferente / confirmado) · **equivalente no nosso sistema** (tela, rota,
tabela ou "não existe").

Detalhe máximo em:
1. Todos os itens **[CONFERIR]** da seção 5 (copie os textos das predefinições).
2. "Nova campanha": abra o assistente de **cada um dos 15 tipos** e da Campanha
   de Vendedores, documente os 7 passos e diga qual gatilho nosso corresponde.
   Saia sem criar nem salvar rascunho.
3. Resultados e atividades de campanhas existentes (estrutura, não dados).
4. "Criar novo grupo" → "Adicionar filtro": confirme as 29 categorias e os 119
   filtros.
5. Todas as visões de Indicadores e o criador de dashboards.
6. WhatsApp: Telefones Oficiais, "Criar novo modelo" nos 6 formatos (sem enviar
   para aprovação), número não oficial.
7. Editor de e-mail (blocos, categorias, Kit da marca, produtos dinâmicos,
   imagem com IA).
8. Editores de pop-up e de pesquisa.
9. Atendimento e todas as telas de configuração do Martin.
10. Integrações: lista completa e telas da Yampi e da Shopify (sem Integrar).
11. Configurações: todas as seções.

No fim: árvore completa do menu, telas que não abriu (e por quê), ações não
testadas.

### FASE 2 — Conferência do nosso sistema (SSH, somente leitura)
A seção 2 já descreve o sistema. **Confira e complete; não refaça.**
1. Confira se a seção 2 bate com o servidor (tabelas e contagens, nomes dos
   ajustes, rotas, fluxos). Registre as diferenças.
2. Leia e explique como funciona hoje, apontando onde cada mudança entraria:
   - `auto/motor.ts`: agendamento e execução dos passos; onde entram grafo,
     expiração, dias da semana, semi-automático;
   - `auto/extrator.ts`: origem de cada variável; onde recalcular no envio;
   - `envio.ts`: onde entra a camada de canais sem mudar o Grupo VIP;
   - `db/schema.sql` e `db/conexao.ts`: padrão das migrações;
   - `painel/construtor.ts`: definição dos tipos de parte;
   - webhook da Yampi: o que é guardado e o que é descartado de cada evento.
3. Grupo VIP: mapeie módulos, tabelas e fluxos; marque cada peça como
   **"congelada"**.
4. Yampi: confirme o que já faz; liste o necessário para a base de clientes e
   pedidos; veja os logs de 24–72h (só leitura) e anote falhas.
5. Pontos de extensão: onde cada módulo novo entra **ao lado** do existente.

### FASE 3 — Matriz de encaixe
Para **cada funcionalidade da Martz**, uma linha com: funcionalidade · nosso
equivalente hoje · estado (pronto / parcial / não existe / não se aplica) · o
que falta · arquivos afetados · risco para o Grupo VIP · risco para a Yampi ·
esforço (P/M/G) · prioridade (P0–P3) · como fazer melhor que a Martz.

Cobertura mínima: os 15 tipos × nossos gatilhos; recursos da ação; atividades e
status; base de clientes e pedidos; RFM e grupos de clientes; WhatsApp Oficial e
não oficial 1:1; variáveis; bônus × cashback da Yampi; indicadores, atribuição
direta (`cart_token`) e 48h, UTMs; e-mail; pop-up; pesquisas; atendimento; IA;
colaboradores e funções (necessário para vender); Tag Manager; Shopify.

Diferenciais obrigatórios no plano:
1. **Grupos VIP ligados ao CRM** (filtro "está no VIP", convite automático para
   Campeões, receita do grupo com cupom exclusivo), sempre lendo o VIP, nunca
   alterando o motor dele.
2. **Motor em grafo.**
3. **Variáveis recalculadas no envio.**
4. Manter espera em segundos e encerramento por evento.
5. **Atribuição direta por `cart_token`**, além das 48h.
6. **Grupo de controle** para medir a receita que o fluxo realmente adiciona.
7. **Contagem de mensagens de marketing por cliente** antes de enviar pelo Oficial.
8. **Analista com Claude.**
9. **Marca branca** em todas as telas novas.

### FASE 4 — Arquitetura de encaixe (incremental)
1. Manter a stack; justificar com números qualquer mudança.
2. Tabelas e colunas novas (**só adicionar**), no padrão de `db/conexao.ts`, com
   impacto nos testes da Yampi.
3. Motor: do linear ao grafo migrando o fluxo 15 **sem mudar o comportamento**.
4. Camada de canais em `envio.ts`.
5. WhatsApp Oficial: WABA do cliente, token de usuário de sistema, chip novo,
   webhooks de status e qualidade.
6. Operação: git, backup fora da VPS, restauração testada junto com a migração
   para a Hostinger SP (subindo com fluxos e disparos pausados).

### FASE 5 — Roteiro
Fases de 1 a 2 semanas. Em cada uma: entregas · **critério de aceite testável** ·
arquivos afetados · o que **não** será tocado · como testar sem cliente real
(`TELEFONE_TESTE`, grupos de teste, modo teste) · plano de volta atrás.

Ordem-base (ajuste com o que as fases anteriores mostrarem):
0. Base segura: git, backup fora da VPS, remover rotas legadas, corrigir `BLOCOS`.
1. Carrinho em produção: variáveis no envio, limite de atraso, dias da semana,
   janela 09–20 e esperas em horas. **Sair do teste só com a minha ordem.**
2. Base da loja: clientes, pedidos, backfill Yampi, deduplicação, `cart_token`.
3. Fluxos transacionais: Pix/pagamento recusado, status + rastreio, pós-compra,
   cashback vencendo; tela única de Atividades.
4. Motor em grafo.
5. Segmentação: RFM, grupos de clientes, gatilhos por tempo, filtro VIP.
6. Indicadores e atribuição.
7. WhatsApp Oficial.
8. Claude: Redator, Analista, Revisor de template, Diretor de arte.
9. E-mail.
10. Shopify, pop-up e pesquisas.
11. Produto: instalador, colaboradores com funções, migração para Hostinger SP.

---

## 8. ENTREGÁVEIS

Salve em `docs/analise-martz/` na pasta local:

1. `01-varredura-martz.md` — Fase 1, tela a tela.
2. `02-conferencia-sistema-atual.md` — Fase 2.
3. `03-matriz-de-encaixe.md` — Fase 3.
4. `04-arquitetura-de-encaixe.md` — Fase 4, com diagrama e modelo de dados.
5. `05-roteiro.md` — Fase 5.
6. `00-resumo-executivo.md` — no máximo 1 página: o que a Martz tem que ainda
   não temos; onde já estamos à frente; as decisões que preciso tomar; o primeiro
   passo recomendado.

**Decisões que quero ver respondidas com recomendação:**
1. Uma instalação por cliente ou SaaS multi-loja.
2. Chip do WhatsApp Oficial.
3. Papel da Shopify ao lado do checkout Yampi.
4. Cashback da Yampi ou bônus próprio.
5. Provedor de e-mail e modelo de imagem.
6. Quando e com quais horários o fluxo de carrinho sai do teste.

Ao terminar, me mostre o resumo executivo e pergunte se pode seguir para a
Fase 0 do roteiro. **Não implemente nada antes da minha aprovação.**
