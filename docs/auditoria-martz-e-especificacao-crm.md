# Auditoria da Martz e especificação do CRM de Retenção Vitorine

*Versão 1 — 26/09/2026*

---

## 0. Antes de tudo: o que esta análise cobre e o que não cobre

Seja qual for a decisão que você tomar a partir deste documento, ela precisa saber
de onde vem cada informação.

| Fonte | Situação |
|---|---|
| Painel logado `painel.martz.com.br` | **Não acessado.** Esta sessão roda num servidor na nuvem, não no seu Chrome. Não tenho a extensão do navegador nem a sua sessão logada. |
| Site e central de ajuda da Martz | **Bloqueados** pela rede desta sessão. Usei só os trechos que a busca pública devolve (títulos e resumos de artigos). |
| O seu sistema do Grupo VIP | **Não está neste repositório.** O `vitorineecombr/ecom` hoje tem uma API de loja de exemplo (produtos/carrinho). O código do Grupo VIP vive em `/opt/grupo-vip` na Contabo. Analisei o que o `OPERACAO.md` descreve. |

Por isso cada funcionalidade abaixo vem marcada:

- **[confirmado]** — aparece na documentação pública da Martz
- **[inferido]** — padrão de mercado para CRM de retenção; é muito provável que exista, mas precisa ser conferido no painel

Na seção 9 está o que falta para fechar a auditoria "100%".

---

## 1. Mapa de módulos da Martz

```
Martz
├── Dashboards ........................ faturamento atribuído, envios, conversão
├── Clientes / Base ................... cadastro unificado, histórico de pedidos
│   ├── Matriz RFM .................... [confirmado] quintis, segmentos automáticos
│   └── Segmentos / Grupos ............ [confirmado] incluir e excluir grupos
├── Campanhas (automações) ............ [confirmado]
│   ├── Carrinho abandonado
│   ├── Recuperação de pedidos
│   ├── Resgate (Pix/boleto pendente ou cancelado)
│   ├── Status do pedido
│   ├── Pós-vendas
│   ├── Saudades (sem comprar há X dias)
│   ├── Aniversariante do dia
│   ├── Aniversário de primeira compra
│   └── Comunicação (disparo segmentado / broadcast)
├── Canais
│   ├── WhatsApp API Oficial (Meta) ... [confirmado] modelos de mensagem, ativação/migração
│   ├── E-mail ........................ [confirmado] editor com templates prontos
│   ├── SMS ........................... [confirmado]
│   └── Nuvem Marketing ............... [confirmado] (exclusivo Nuvemshop — não se aplica a você)
├── Bônus
│   ├── Cupom ......................... [confirmado]
│   └── Cashback / Giftback ........... [confirmado]
├── Pesquisas ......................... [confirmado] texto, NPS, CSAT
├── Martin (IA) ....................... [confirmado] seção "Martin Agentes", 12 artigos
├── Integrações ....................... [confirmado] Shopify, Yampi, Tray, VTEX, Nuvemshop, Tiny, etc.
└── Configurações gerais .............. [confirmado] seção existe; conteúdo [inferido]
```

---

## 2. Módulo por módulo — o que faz e como provavelmente foi construído

### 2.1 Integração com a loja

**O que faz [confirmado]:** sincroniza clientes, pedidos, produtos e histórico
de compras em tempo real.

**Como se constrói:**

1. **Importação inicial (backfill).** Ao conectar a loja, um job puxa todo o
   histórico de pedidos e clientes pela API, paginado. É isso que alimenta a RFM
   desde o primeiro dia.
2. **Tempo real por webhook.** A loja avisa o CRM a cada evento. O CRM responde
   `200` na hora e processa numa fila — nunca dentro da requisição.
3. **Reconciliação.** Um job periódico compara os últimos pedidos pela API,
   porque webhook se perde.

**Para as suas duas integrações:**

| | Shopify | Yampi |
|---|---|---|
| Acesso | App personalizado no admin (Admin API, GraphQL) | Token de usuário + chave secreta, por alias da loja |
| Pedido criado / pago / atualizado | webhooks `orders/create`, `orders/paid`, `orders/updated`, `orders/cancelled` | webhooks de pedido (criado, pago, status alterado) |
| Carrinho abandonado | webhooks de `checkouts/create` e `checkouts/update` + checkout sem pedido após X min | evento de carrinho abandonado da própria Yampi |
| Rastreio | `fulfillments/create`, `fulfillments/update` | status do pedido (enviado, entregue) |
| Cupom e cashback | criar código de desconto via Admin API | criar cupom via API |
| Segurança do webhook | verificar HMAC no header | verificar assinatura/segredo da Yampi |

> Na Shopify, ler nome, e-mail e telefone de cliente exige a aprovação de
> **dados protegidos de cliente** no app. Sem isso os webhooks chegam sem telefone
> — e sem telefone não existe WhatsApp.

**Ponto de atenção Vitorine:** se o checkout é Yampi e a vitrine é Shopify, o
mesmo cliente e o mesmo pedido podem chegar pelas duas integrações. O CRM precisa
de uma **chave de deduplicação** (telefone normalizado em E.164 + e-mail) e de
uma regra de "qual integração é dona do pedido".

### 2.2 Base de clientes e Matriz RFM

**O que faz [confirmado]:** a base é dividida em **quintis** para cada critério
(Recência, Frequência, Valor). Cada cliente ganha uma nota de 1 a 5 em cada um,
e a combinação o coloca num segmento automaticamente.

**Como se constrói:**

1. Job noturno calcula, por cliente: dias desde a última compra, número de
   pedidos pagos, soma do valor pago.
2. Divide a base em 5 faixas iguais em cada critério (`NTILE(5)` no Postgres).
3. Mapeia a combinação para o segmento. O mapa padrão de mercado:

| Segmento | Regra típica (R, F+M) |
|---|---|
| Campeões | R 5, F/M 5 |
| Leais | R 3–5, F/M 4–5 |
| Potenciais leais | R 4–5, F/M 2–3 |
| Novos | R 5, F 1 |
| Promissores | R 4, F 1 |
| Precisam de atenção | R 3, F/M 3 |
| Quase dormindo | R 3, F/M 1–2 |
| Em risco | R 1–2, F/M 3–5 |
| Não pode perder | R 1, F/M 5 |
| Hibernando | R 1–2, F/M 2 |
| Perdidos | R 1, F/M 1 |

4. Guarda o histórico da nota. Isso permite o que a Martz vende como valor:
   **"quantos clientes saíram de Em risco para Leais este mês"**.

**Ponto de atenção:** com base pequena, quintil distorce (muita gente com 1
pedido cai na mesma faixa). Vale ter a opção de **faixas fixas** configuráveis
(ex.: F = 1, 2, 3, 4–5, 6+).

### 2.3 Segmentos

**O que faz [confirmado]:** a campanha pode ser **restrita** a grupos e pode
**excluir** grupos.

**Como se constrói:** um construtor de regras (E/OU) sobre campos do cliente
e dos pedidos, salvo como JSON e traduzido para SQL. Filtros mínimos:

- segmento RFM, tags, cidade/UF, gênero (se houver)
- comprou / não comprou produto, coleção, categoria, tamanho
- nº de pedidos, ticket médio, total gasto, data da última compra
- canal de aquisição, cupom usado, integração de origem
- aceite de marketing por canal (WhatsApp, e-mail, SMS)
- respondeu pesquisa / nota NPS
- **participa de Grupo VIP** (exclusivo seu — ver 2.12)

### 2.4 Campanhas (o coração do produto)

**Estrutura confirmada** de uma campanha na Martz:

| Aba / fase | Conteúdo |
|---|---|
| Parâmetros | tipo, nome, gatilho |
| Gatilhos | condições do pedido que disparam (ex.: pós-venda só para pedidos de certa categoria) |
| Segmentação | incluir grupos / excluir grupos |
| Ações | as mensagens, em sequência, com espera entre elas, por canal |
| Bônus | cupom ou cashback opcional |
| Pesquisa | vincula pesquisa de satisfação enviada a quem entra |
| Opções avançadas | janela de envio, limite de atraso, cálculo preditivo |

**Os 9 tipos de campanha [confirmado]:**

| Tipo | Gatilho | Uso na Vitorine |
|---|---|---|
| Carrinho abandonado | checkout iniciado sem pedido após X min | 1ª msg 30–60 min, 2ª 24h, 3ª 48h com cupom |
| Recuperação de pedidos | pedido criado e não pago | lembrete com link de pagamento |
| Resgate | Pix/boleto pendente ou cancelado | reenviar Pix/boleto, oferecer cartão |
| Status do pedido | mudança de status (pago, enviado, entregue) | template **Utilidade**, mais barato |
| Pós-vendas | X dias após entrega, com filtros de pedido | cuidados com o couro, pedir avaliação, cross-sell cinto/carteira |
| Saudades | sem comprar há X dias | ciclo de recompra de calçado |
| Aniversariante do dia | data de nascimento | cupom de aniversário |
| Aniversário de 1ª compra | 1 ano da primeira compra | reforço de marca |
| Comunicação | manual, para um segmento | lançamentos, datas comerciais |

**Opções avançadas [confirmado]:**

- **Janela de envio:** padrão 00:00–23:59; configurável (ex.: 09:00–18:00).
- **Limite de atraso:** quantas horas a mensagem ainda pode sair depois de criada.
  Se o número caiu ou bateu o limite da Meta, a mensagem **expira** em vez de sair
  fora de contexto horas depois. Você já tem a ideia de janela no Grupo VIP;
  o limite de atraso é a peça que falta.
- **Modo de disparo:** **automático** (sai sozinho) ou **semi-automático**
  (fica pendente e alguém clica para enviar, uma a uma).

**Como se constrói o motor:**

```
evento (webhook) ──► avaliador de gatilhos ──► cria "inscrição" do cliente na campanha
                                                     │
                                  agendador ◄────────┘  (1 linha por passo, com horário)
                                     │
             checa: ainda elegível? (já pagou? já comprou? pediu para sair?)
                                     │
             checa: janela de envio, limite de atraso, teto por número
                                     │
                           fila por canal/número ──► provedor ──► status (enviado/entregue/lido/falha)
```

A regra que mais evita constrangimento: **reavaliar a elegibilidade no momento
do envio**, não só na entrada. Quem já pagou não pode receber "seu Pix vai vencer".

### 2.5 WhatsApp — Oficial e Não Oficial (o que você pediu)

A Martz trabalha com a **API Oficial** [confirmado]. O seu diferencial é ter as
duas, e cada uma serve a um uso diferente:

| | API Oficial (Meta Cloud API) | Não Oficial (Evolution / Baileys) |
|---|---|---|
| Risco de bloqueio | baixo, se respeitar qualidade | alto em disparo para quem não te conhece |
| Grupos | **não envia para grupos** | **sim — é a base do Grupo VIP** |
| Mensagem iniciada pela loja | só com **modelo aprovado** pela Meta | texto livre |
| Custo | por mensagem, conforme a categoria | só servidor |
| Botões, carrossel, lista | nativos e estáveis | funcionam, com os limites do seu manual |
| Número | número dedicado verificado na Meta | qualquer número pareado por QR |

**Recomendação de uso:**

- **Oficial** → campanhas 1:1 automáticas (carrinho, resgate, status, pós-venda,
  saudades). São as que vão para muita gente que não salvou seu número.
- **Não Oficial** → Grupos VIP, e 1:1 apenas para quem já conversa com você.

**Como se constrói:** uma camada `ProvedorWhatsApp` com a mesma interface para os dois:

```
enviarTexto(numero, texto)
enviarModelo(numero, modelo, variaveis)     // só oficial
enviarMidia(numero, tipo, url, legenda)
enviarInterativo(numero, botoes | carrossel)
statusDaConexao()
```

Cada campanha escolhe o **número remetente**; o número sabe seu provedor.
A Evolution API v2 também aceita conexão com a Cloud API da Meta — dá para ter
os dois tipos passando pelo mesmo contêiner. Mesmo assim recomendo falar com a
Meta **direto** para o oficial: webhooks de status e de qualidade chegam sem
intermediário, e uma atualização da Evolution não derruba as campanhas pagas.

**Modelos de mensagem (templates) [confirmado]:**

- A Martz recomenda criar na categoria **Utilidade** com tom informativo, para
  aprovar mais fácil e custar menos que Marketing.
- A Martz oferece um "ChatGPT treinado" para escrever modelos. No seu CRM isso
  vira um botão **"Escrever com Claude"** dentro do editor de modelo (ver 2.9).
- Tela necessária: lista de modelos sincronizada com a Meta, status (aprovado,
  pendente, rejeitado + motivo), categoria, variáveis `{{1}}` mapeadas para campos
  do cliente/pedido, prévia.

**Monitoramento obrigatório da oficial:** nota de qualidade do número, limite
diário de conversas (tier), templates pausados pela Meta. Se a qualidade cair,
o CRM deve **pausar sozinho** as campanhas de Marketing daquele número.

### 2.6 E-mail

**O que faz [confirmado]:** editor com templates prontos.

**Como se constrói:**

- Editor de arrastar blocos que gera HTML compatível com e-mail (ex.: GrapesJS
  ou Unlayer; ou MJML por baixo).
- Blocos dinâmicos: produto do carrinho, produtos recomendados, cupom, nome.
- Envio por provedor transacional (Amazon SES é o mais barato em volume;
  Resend/Postmark/SendGrid são mais simples). **Não envie e-mail direto da VPS
  Contabo** — IP de VPS cai em spam.
- Domínio com SPF, DKIM e DMARC; descadastro em 1 clique (exigido por
  Gmail/Yahoo para remetente em volume).
- Webhooks do provedor: entregue, aberto, clicado, bounce, reclamação →
  bounce/reclamação removem o e-mail da base automaticamente.

**Geração de imagem com IA:** o Claude **não gera imagens** — ele lê imagens e
escreve texto. O desenho certo é:

1. Claude escreve o prompt da imagem a partir do produto e da campanha
   (o mesmo método da sua skill de prompts de imagem).
2. Um modelo de imagem gera (Gemini Image / "Nano Banana", GPT Image, etc.).
3. A imagem vai para o seu armazenamento e entra no bloco do e-mail.

Isso iguala o que a Martz oferece e mantém o Claude como o "cérebro".

### 2.7 SMS

**[confirmado]** como canal. Constrói-se como mais um provedor da mesma camada de
canais (ex.: Zenvia, Comtele, Twilio). Útil como **fallback** quando o WhatsApp
falha (número sem WhatsApp). Prioridade baixa para a Vitorine.

### 2.8 Bônus: cupom, cashback, giftback

**[confirmado]** Cupom na aba Bônus; cashback criado a partir de campanhas de
Status do Pedido ou Pós-venda (o "giftback").

**Como se constrói:**

- **Cupom único por cliente** criado via API da Shopify/Yampi no momento do envio,
  com validade — assim dá para atribuir a venda com certeza.
- **Cashback/giftback** = saldo do cliente no CRM, com validade, liberado X dias
  após a entrega, entregue como cupom de valor fixo. Tabela de movimentos
  (crédito, uso, expiração) para auditar.
- Lembrete automático "seu cashback vence em 3 dias" — a campanha que mais
  converte nesse modelo.

### 2.9 Martin (IA) → equivalente com Claude

**[confirmado]** A Martz tem "Martin Agentes" (12 artigos na ajuda) e
anuncia análise de dados e otimização de mensagens com IA. O conteúdo exato de
cada agente **precisa ser conferido no painel**.

Proposta de agentes com Claude, do mais valioso ao menos:

| Agente | O que faz | Entrada | Saída |
|---|---|---|---|
| **Analista** | lê os números da semana e explica o que mudou e o que fazer | métricas agregadas (receita atribuída, RFM, campanhas) | relatório com 3–5 ações |
| **Redator** | escreve mensagem de WhatsApp, modelo Meta e e-mail no tom da marca | tipo de campanha, produto, segmento | variações prontas, com categoria sugerida |
| **Revisor de modelo Meta** | avisa antes de enviar para aprovação se o texto vai cair em Marketing ou ser rejeitado | texto do modelo | risco + reescrita |
| **Diretor de arte** | escreve o prompt da imagem do e-mail/WhatsApp | produto + campanha | prompt → modelo de imagem |
| **Segmentador** | transforma pedido em linguagem natural em segmento ("quem comprou mocassim e não voltou em 90 dias") | frase | regra de segmento para você confirmar |
| **Atendente** (fase posterior) | responde conversas na janela de atendimento | histórico da conversa + pedidos | resposta, ou transfere para humano |

**Como se constrói:**

- Chamadas à API da Anthropic pelo backend (nunca do navegador — a chave fica no
  servidor).
- O agente **não consulta o banco livremente**: o backend monta um resumo com
  números agregados e manda para o Claude. Isso protege dados de cliente e custa
  menos.
- Para o Segmentador e o Analista, usar *tool use*: o Claude chama funções que
  você expõe (`buscarMetricas(periodo)`, `contarSegmento(regra)`) e o backend
  executa.
- A voz da marca (a sua skill de persona) entra como instrução fixa, com cache
  de prompt.
- Modelo: Claude Sonnet para o dia a dia; Opus para o relatório semanal do Analista.

### 2.10 Pesquisas

**[confirmado]** Tipos de resposta: texto, NPS, CSAT, entre outros. Vinculada à
campanha e enviada automaticamente; indicadores de NPS médio e taxa de resposta.

**Como se constrói:** página pública curta (link único por cliente, sem login),
respostas gravadas no cliente, e **gatilhos** a partir da resposta:
NPS 9–10 → pedir avaliação/indicação; 0–6 → alerta para você responder.

### 2.11 Dashboards e atribuição de receita

**[confirmado]** Atribuição **preditiva de 48h**: se o cliente recebeu mensagem e
fez pedido pago em até 48h, a receita conta para a campanha, quando a flag de
cálculo preditivo está ligada. Sem a flag, só conta atribuição direta.

**Como se constrói — dois tipos de atribuição, sempre mostrados separados:**

| Tipo | Regra | Confiança |
|---|---|---|
| Direta | pedido usou o cupom da campanha ou veio do link com UTM da mensagem | alta |
| Por janela | pedido pago até 48h depois de uma mensagem entregue | média (parte compraria mesmo assim) |

Regra de desempate: se o cliente recebeu várias mensagens, a receita vai para a
**última** entregue antes do pedido — nunca para todas.

**Painel mínimo:**

- receita atribuída (direta vs. janela) por período, campanha e canal
- enviados → entregues → lidos → clicados → compraram
- recuperação de carrinho (%), recompra (%), LTV médio
- distribuição e migração entre segmentos RFM
- saúde dos números: conectado, qualidade (oficial), falhas por hora
- custo de mensagens da Meta vs. receita (ROI por campanha)

> O mais honesto a fazer, que a Martz não mostra: um **grupo de controle**
> (ex.: 10% dos elegíveis não recebem) para medir quanto a campanha realmente
> adiciona.

### 2.12 Gestão de Grupos VIP (exclusivo seu — manter)

A Martz não tem. O que você já construiu, pelo `OPERACAO.md`:

- até 2 números via Evolution, cada grupo escolhe o número que dispara
- disparo em até 4 partes: texto, imagem, vídeo, GIF, áudio (ptt), vídeo bolinha,
  carrossel (até 10 cards)
- regras que protegem a notificação: parte 1 nunca é carrossel nem áudio
  (menção só funciona fora de mensagem interativa)
- espaçamento por número (piso de 15s, recomendado ≥ 40s), janela de horário,
  teto diário, tentativas
- telas de Agendamento e Histórico; backup diário com a API online do SQLite

**O que muda ao entrar no CRM:**

1. O Grupo VIP vira um **módulo** do CRM, com o mesmo login.
2. Os números da Evolution passam a ser os números "Não Oficial" da camada
   da seção 2.5 — um único cadastro de números.
3. **Ligação cliente ↔ grupo:** sincronizar participantes dos grupos e casar
   com a base pelo telefone. Isso libera:
   - segmento "está / não está no VIP"
   - campanha "convidar para o VIP" para Campeões e Leais que não estão
   - receita atribuída ao disparo do grupo (cupom exclusivo do grupo)
4. Toda a lógica de disparo que você já validou (partes, ordem, limites) é
   **mantida como está**. Não reescrever o que funciona.

### 2.13 Configurações gerais

**[inferido]** — conferir no painel:

- dados da loja, fuso horário, moeda
- usuários e permissões (admin, operador, só leitura)
- números de WhatsApp (oficial e não oficial) e status
- domínio de e-mail, remetente, rodapé legal
- horário padrão de envio, limite de atraso padrão, teto por número
- lista de bloqueio (quem pediu para sair) por canal
- palavras de saída ("SAIR", "PARAR") que descadastram automaticamente
- chaves de API e webhooks de saída

---

## 3. Arquitetura proposta na sua VPS Contabo

Hoje: `gv-evolution`, `gv-app`, `gv-postgres` (da Evolution), `gv-redis`
(da Evolution), SQLite do app, painel por túnel SSH.

Proposta:

```
                    Internet (HTTPS, Caddy)
                           │
         ┌─────────────────┼──────────────────────┐
         │                 │                      │
   painel (web)      /webhooks/*            página de pesquisa
         │         Shopify · Yampi · Meta          │
         │         Evolution · e-mail              │
         └────────────► API (app) ◄────────────────┘
                           │
            ┌──────────────┼───────────────┐
         Postgres        Redis          workers
       (dados do CRM)  (filas BullMQ)  envio · RFM · sync · IA
                                            │
                     ┌──────────────────────┼─────────────────────┐
               Meta Cloud API        Evolution (grupos)     SES · SMS · Claude
```

| Decisão | Por quê |
|---|---|
| **Postgres para o CRM**, não SQLite | vários workers escrevendo ao mesmo tempo (webhooks + envios + RFM). SQLite serve o Grupo VIP hoje; não serve a base de clientes e pedidos. |
| Postgres **separado** do da Evolution | atualizar a Evolution não pode arriscar os seus dados |
| Redis + fila (BullMQ) | webhook responde em milissegundos; retentativa com espera; limite por número |
| Caddy com HTTPS | **obrigatório**: Shopify, Yampi e Meta só entregam webhook em HTTPS público. O túnel SSH não serve mais. |
| Login de verdade no painel | sai o usuário/senha único do `.env`; entra usuário por pessoa, senha com hash, 2FA opcional |
| Backup fora da VPS | `pg_dump` diário enviado para armazenamento externo (Backblaze B2 / S3). Hoje o backup mora no mesmo servidor. |

Tamanho de VPS: com Postgres + Redis + Evolution + app + workers, 8 GB de RAM
é o mínimo confortável.

---

## 4. Modelo de dados (núcleo)

```
lojas            (id, nome, fuso)
integracoes      (id, loja_id, tipo[shopify|yampi], credenciais_cifradas, ultima_sync)
clientes         (id, loja_id, nome, email, telefone_e164, nascimento, cidade, uf,
                  aceite_whatsapp, aceite_email, aceite_sms, origem, criado_em)
pedidos          (id, loja_id, cliente_id, integracao_id, id_externo, status,
                  status_pagamento, metodo_pagamento, total, cupom, utm_*,
                  criado_em, pago_em, enviado_em, entregue_em)
itens_pedido     (pedido_id, produto_id, variante, qtd, preco)
produtos         (id, loja_id, id_externo, nome, categoria, colecao, imagem_url, url)
carrinhos        (id, cliente_id, id_externo, itens_json, url_recuperacao, valor,
                  criado_em, convertido_em_pedido_id)
rfm_notas        (cliente_id, data, r, f, m, segmento)
segmentos        (id, nome, regra_json, tipo[dinamico|estatico])
numeros_whatsapp (id, nome, telefone, provedor[oficial|evolution], status,
                  qualidade, limite_diario, credenciais_cifradas)
modelos_meta     (id, numero_id, nome, categoria, idioma, status, corpo, variaveis_json)
campanhas        (id, tipo, nome, status, gatilho_json, incluir_segmentos, excluir_segmentos,
                  janela_inicio, janela_fim, limite_atraso_h, modo[auto|semi],
                  atribuicao_janela_h, grupo_controle_pct)
passos_campanha  (id, campanha_id, ordem, espera_min, canal, numero_id, modelo_id,
                  conteudo_json, bonus_json)
inscricoes       (id, campanha_id, cliente_id, origem_evento, status, criada_em, saiu_em, motivo_saida)
envios           (id, inscricao_id, passo_id, canal, destino, status, agendado_para,
                  expira_em, enviado_em, entregue_em, lido_em, clicado_em, erro, custo)
cupons           (id, cliente_id, campanha_id, codigo, valor, validade, usado_em_pedido_id)
cashback_mov     (id, cliente_id, tipo[credito|uso|expira], valor, validade, origem)
pesquisas        (id, nome, perguntas_json)
respostas        (id, pesquisa_id, cliente_id, respostas_json, nps, criado_em)
atribuicoes      (pedido_id, envio_id, tipo[direta|janela], valor)
optouts          (telefone_ou_email, canal, motivo, criado_em)
-- módulo Grupo VIP (o que você já tem, migrado)
grupos, participantes_grupo(grupo_id, telefone_e164, cliente_id), disparos_grupo, partes_disparo
-- IA
analises_ia      (id, tipo, periodo, entrada_resumo, saida, criado_em)
```

---

## 5. Pontos de risco no seu sistema atual (a partir do `OPERACAO.md`)

| # | Ponto | Risco | Ação |
|---|---|---|---|
| 1 | Evolution em `2.4.0-rc2` | versão *release candidate* em produção | fixar numa estável ao montar o CRM, com backup antes |
| 2 | Backup só na própria VPS | perder a VPS = perder tudo | enviar cópia diária para fora (B2/S3) — automático, não manual |
| 3 | Painel com senha única no `.env` | não há usuário por pessoa nem registro de quem fez o quê | login próprio + log de auditoria |
| 4 | Painel só por túnel SSH | webhooks da Shopify/Yampi/Meta precisam de HTTPS público | Caddy + subdomínio (seção 8 do seu manual já prevê) |
| 5 | SQLite no app | não aguenta a carga de CRM (muitos escritores) | CRM em Postgres; Grupo VIP pode migrar depois |
| 6 | Limite de 2 números | CRM com oficial + não oficial precisa de mais | tornar o limite configurável |
| 7 | Sem "limite de atraso" | mensagem presa pode sair horas depois, fora de contexto | adicionar expiração por envio |
| 8 | Sem lista de descadastro | cliente que pediu para sair continua recebendo | tabela `optouts` + palavras de saída |
| 9 | LGPD | base de clientes com telefone e compras | registrar base legal do contato, permitir exclusão, cifrar credenciais |

Pontos **fortes** que você já tem e a Martz não mostra publicamente: espaçamento
por número (não por fila), regra da parte 1 que garante notificação, backup com
API online do SQLite, fechamento do SSH com fail2ban. Isso é maturidade de
operação — manter.

---

## 6. Onde dá para ser melhor que a Martz

1. **Grupos VIP integrados ao CRM** — segmento, convite automático e receita do grupo.
2. **Oficial + Não Oficial** no mesmo painel, com regra de qual usar por campanha.
3. **Grupo de controle** — receita incremental de verdade, não só janela de 48h.
4. **Claude com a voz da Vitorine** — as suas skills de persona, CRM e e-mail
   viram instruções fixas dos agentes.
5. **Revisor de modelo Meta antes de enviar** — menos reprovação, mais Utilidade.
6. **Pausa automática por qualidade** do número oficial.
7. **Deduplicação Shopify + Yampi** — uma visão do cliente mesmo com dois sistemas.

---

## 7. Roteiro de construção

| Fase | Entrega | Depende de |
|---|---|---|
| **0. Fundação** | Caddy + HTTPS, Postgres do CRM, Redis/filas, login, backup externo | subdomínio apontado |
| **1. Dados** | integração Shopify + Yampi (backfill, webhooks, reconciliação), deduplicação, tela de clientes e pedidos | fase 0 |
| **2. Segmentação** | RFM diária + histórico, construtor de segmentos, optouts | fase 1 |
| **3. WhatsApp duplo** | camada de provedor, número oficial na Meta, modelos, webhooks de status | conta Meta Business verificada |
| **4. Campanhas** | motor + os 9 tipos, janela, limite de atraso, modo semi-automático | fases 2 e 3 |
| **5. Bônus e atribuição** | cupom único, cashback, dashboard com atribuição direta e por janela | fase 4 |
| **6. E-mail** | editor, SES, domínio autenticado, descadastro | domínio |
| **7. Claude** | Redator, Revisor de modelo, Analista semanal, Diretor de arte + modelo de imagem | chave da API Anthropic |
| **8. Grupo VIP no CRM** | módulo, números unificados, ligação cliente ↔ grupo | fase 3 |
| **9. Pesquisas, SMS, Atendente IA** | NPS/CSAT, SMS de fallback, agente de atendimento | — |

A ordem prioriza o que gera receita cedo: carrinho abandonado + resgate de Pix
pela API oficial (fases 1–4) pagam o projeto antes do resto existir.

---

## 8. Decisões que são suas

1. **Stack:** manter a linguagem do `gv-app` (para reaproveitar o Grupo VIP) ou
   começar o CRM em Node/TypeScript + Next.js? Depende do que o `gv-app` usa hoje.
2. **Checkout:** a Vitorine vende pela Shopify, pela Yampi, ou Shopify com
   checkout Yampi? Isso define quem é "dono" do pedido.
3. **Número oficial:** usar um número novo, ou migrar um dos números atuais para a
   API oficial? (Número migrado para a oficial **deixa de funcionar** no app e na
   Evolution — não pode ser o número dos grupos.)
4. **Provedor de e-mail** e **modelo de imagem**.
5. **Multi-loja:** o CRM será só para a Vitorine ou você pretende vender para
   outras lojas (como a Martz)? Multi-loja muda o banco desde o início.

---

## 9. O que falta para a auditoria ficar 100%

Esta sessão não consegue entrar no painel da Martz. Para completar:

1. **Rode a análise pelo Claude no Chrome** (a extensão, na sua máquina), com o
   pedido: *"percorra cada item do menu da Martz e liste campos, opções e botões
   de cada tela"*. Traga o resultado para cá.
   — ou —
   **Mande prints** de cada tela: Dashboard, Clientes, RFM, Segmentos, cada tipo de
   campanha (todas as abas), Modelos de WhatsApp, Editor de e-mail (incluindo o
   gerador de imagem), Martin (cada agente), Pesquisas, Integrações, Configurações.
2. **Suba o código do Grupo VIP** (`/opt/grupo-vip`, sem o `.env` e sem `dados/`)
   para um repositório no GitHub, para eu auditar o que já existe e planejar o
   encaixe no CRM.
3. Responda as decisões da seção 8.

---

## Fontes públicas usadas

- [Martz — CRM para retenção de E-commerce](https://www.martz.com.br/)
- [Martz — Plataforma](https://www.martz.com.br/plataforma)
- [Martz — Integrações](https://www.martz.com.br/integracoes)
- [Central de Ajuda Martz](https://ajuda.martz.com.br/pt-BR/)
- [Como criar uma campanha](https://ajuda.martz.com.br/pt-BR/articles/10166717-como-criar-uma-campanha)
- [Coleção Campanhas](https://ajuda.martz.com.br/pt-BR/collections/10178109-campanhas)
- [Carrinho Abandonado](https://ajuda.martz.com.br/pt-BR/articles/10223350-criar-campanha-de-carrinho-abandonado)
- [Recuperação de Pedidos](https://ajuda.martz.com.br/pt-BR/articles/10226177-criar-campanha-de-recuperacao-de-pedidos)
- [Resgate](https://ajuda.martz.com.br/pt-BR/articles/10226507-criar-campanha-de-resgate)
- [Status do Pedido](https://ajuda.martz.com.br/pt-BR/articles/10248668-criar-campanha-de-status-do-pedido)
- [Pós-Vendas](https://ajuda.martz.com.br/pt-BR/articles/10253741-criar-campanha-de-pos-vendas)
- [Saudades](https://ajuda.martz.com.br/pt-BR/articles/10223056-criar-campanha-de-saudades)
- [Aniversariante do Dia](https://ajuda.martz.com.br/pt-BR/articles/10223354-criar-campanha-de-aniversariante-do-dia)
- [Aniversário de Primeira Compra](https://ajuda.martz.com.br/pt-BR/articles/10223358-criar-campanha-de-aniversario-de-primeira-compra)
- [Campanha de Comunicação](https://ajuda.martz.com.br/pt-BR/articles/10223357-criar-campanha-de-comunicacao)
- [Fase 3 — Status do Pedido](https://ajuda.martz.com.br/pt-BR/articles/15587691-fase-3-status-do-pedido)
- [Cálculo da Matriz RFM](https://ajuda.martz.com.br/pt-BR/articles/14068727-como-funciona-o-calculo-da-matriz-rfm)
- [Modelo de Mensagem na API Oficial](https://ajuda.martz.com.br/pt-BR/articles/10577887-criando-um-modelo-de-mensagem-na-api-oficial)
- [Disparo semi-automático](https://ajuda.martz.com.br/pt-BR/articles/15870857-disparo-semi-automatico-como-executar-os-envios-pendentes)
- [Atribuição de receita (48h)](https://ajuda.martz.com.br/pt-BR/articles/16516891-atribuicao-de-receita-calculo-preditivo-48h-e-por-que-a-receita-gerada-aparece-zerada)
- [Pesquisas Personalizadas](https://ajuda.martz.com.br/pt-BR/articles/10803598-criando-pesquisas-personalizadas)
- [Coleção Integrações](https://ajuda.martz.com.br/pt-BR/collections/10167858-integracoes)
- [Martz na Nuvemshop](https://www.nuvemshop.com.br/loja-aplicativos-nuvem/martz)
