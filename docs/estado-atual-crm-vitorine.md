# DEV — CRM Vitorine · Especificação do estado atual

Levantado direto do servidor em 28/09/2026. Tudo aqui foi medido, não é de memória.

---

## 1. O que é o projeto

Um CRM de disparo por WhatsApp, auto-hospedado, construído para a **Vitorine**
(e-commerce de calçados masculinos, operação de uma pessoa só). Nasceu como
gerenciador de grupos VIP e cresceu para automação de CRM ligada à loja.

Duas metades, que dividem o mesmo painel e o mesmo banco:

| Metade | O que faz | Estado |
|---|---|---|
| **Gerenciador de grupos** | disparo manual em massa para grupos e comunidades de WhatsApp | em produção, usado |
| **Automações (CRM)** | fluxos disparados por evento da Yampi: carrinho abandonado, pedido pago, pagamento recusado, cashback | em modo teste, funcionando ponta a ponta |

A intenção declarada é **vender isso como produto** — o painel já tem marca
branca (nome, logo, cor e fundo configuráveis pelo cliente).

---

## 2. Infraestrutura

### Servidor

| Item | Valor |
|---|---|
| Provedor | **Contabo** (VPS, região Europa) |
| IP | `84.247.132.123` |
| Hostname | `vmi3585083` |
| SO | Ubuntu 24.04.5 LTS · kernel 6.8.0 · x86_64 |
| CPU / RAM / Disco | 4 vCPU · 7,8 GB · 96 GB (13 GB usados, 14%) |
| Fuso | `America/Sao_Paulo` |
| Raiz do projeto | `/opt/grupo-vip` |

> **Nota de infra:** a Contabo Europa é o ambiente de *teste*. A decisão
> registrada é migrar para **Hostinger São Paulo** na produção, pela latência.

### Domínio e HTTPS

| Item | Valor |
|---|---|
| Painel | **https://painel.vitorine.com.br** |
| DNS | **Cloudflare** (`nero.ns.cloudflare.com`, `perla.ns.cloudflare.com`) |
| Registro A | `painel.vitorine.com.br → 84.247.132.123` |
| TLS | **Caddy no host** (não containerizado), Let's Encrypt, renovação automática |

O Caddy é o único processo que atende a internet. Termina o TLS e repassa para
`127.0.0.1:3000`. Configuração em `/etc/caddy/Caddyfile`:

- `header_up X-Forwarded-Proto {scheme}` — o app usa isso para decidir se o
  cookie de sessão sai com a marca `secure`
- `request_body max_size 64MB` — uploads de mídia e carrossel passam de 1 MB
- HSTS de 1 ano, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: same-origin`, header `Server` removido
- log em `/var/log/caddy/painel.log`

### Contêineres (docker compose em `/opt/grupo-vip/docker-compose.yml`)

| Serviço | Imagem | Container | Porta exposta |
|---|---|---|---|
| `app` | `grupo-vip-app` (build local) | `gv-app` | `127.0.0.1:3000` |
| `evolution-api` | `evoapicloud/evolution-api:2.4.0-rc2` | `gv-evolution` | `127.0.0.1:8080` |
| `postgres` | `postgres:16-alpine` | `gv-postgres` | só rede interna |
| `redis` | `redis:7-alpine` | `gv-redis` | só rede interna |

Postgres e Redis existem **para a Evolution API**, não para o app. O app usa
SQLite.

### Portas abertas na internet

Só `22` (SSH), `80` e `443` (Caddy). Todo o resto está preso em `127.0.0.1`.

### Acesso

```
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes root@84.247.132.123
```

**Só chave** — senha desabilitada. Perder a chave significa recuperação apenas
pelo console VNC da Contabo.

---

## 3. Stack e código

| Camada | Escolha |
|---|---|
| Runtime | Node 22 |
| HTTP | **Fastify 5** |
| Banco do app | **better-sqlite3** (SQLite em WAL) |
| Linguagem | TypeScript strict, módulos NodeNext |
| Front-end | HTML renderizado no servidor + HTMX, sem build de front |
| WhatsApp | **Evolution API** com Baileys |

### Onde o código vive

**Só no servidor**, em `/opt/grupo-vip/app/src/`. **Não há repositório git.**
A pasta local contém apenas documentação.

> **Risco aberto:** sem git, não existe histórico, diff, nem rollback de código.
> O único ponto de recuperação é o backup diário.

### Tamanho: 71 arquivos, 13.158 linhas

Os arquivos maiores:

```
1189  painel/rotas.ts          rotas do gerenciador de grupos
 832  painel/construtor.ts     construtor de mensagem compartilhado (canvas)
 640  painel/fluxosTela.ts     tela de fluxos + mapa
 557  painel/rotasAuto.ts      rotas das automações
 531  views/layout.ts          layout, navegação, tema
 518  auto/extrator.ts         variáveis a partir do payload da Yampi
 484  db/schema.sql
 477  db/repos.ts
 404  auto/repos.ts
 385  envio.ts                 envio para a Evolution
 372  server.ts
 355  db/conexao.ts            migrações
 351  painel/novo.ts           tela de novo disparo
 345  auto/motor.ts            o motor de execução dos fluxos
```

Pastas: `auto/` (automações), `painel/` (telas e rotas), `db/`, `conta/`
(login), `evolution/`, `regras/` (janela, teto, intervalo, retry), `views/`,
`worker/`, `midia/`.

### Deploy

```bash
cd /opt/grupo-vip && docker compose build app && docker compose up -d app
```

Conferir tipos sem subir nada:

```bash
docker run --rm -v "$PWD":/app -w /app node:22-alpine npx tsc --noEmit
```

Imagem atual construída em 25/09/2026 21:34 (1,1 GB).

---

## 4. Banco de dados

SQLite em `/opt/grupo-vip/dados/app.db` (`/dados/app.db` dentro do contêiner),
modo WAL. Estado atual:

```
    16  ajustes              configuração chave→valor
    23  botoes               botões de cada parte de mensagem
    46  cards                cards de carrossel
     2  codigos              códigos de login por e-mail
    21  destinos             grupo × disparo, com status de entrega
    25  disparos             disparos manuais
     1  dispositivos         aparelhos que já logaram
    56  entregas             recibo de cada envio aceito pelo WhatsApp
   463  eventos              log de auditoria
    47  eventos_recebidos    webhooks que chegaram
    25  execucao_passos      cada passo já executado
     6  execucoes            casos de fluxo em andamento/encerrados
     1  fluxos
     6  grupo_instancia      qual número dispara para qual grupo
     6  grupos
     1  instancias
     3  modelos              mensagens reutilizáveis
    47  partes               as partes de cada mensagem
     5  passos               os passos do fluxo
     0  rastreios            (previsto, ainda vazio)
     1  sessoes
    10  skus_campanha        cache SKU → está na campanha do checkout
     6  telefones
     1  usuarios
```

### Ajustes gravados hoje

```
carrinho_intervalo_min = 5        varredura da API de carrinhos, em minutos
carrinho_janela_horas  = 48       idade máxima de um carrinho para entrar
carrinho_marco         = 2026-09-25T17:00:00Z   corte anti-enxurrada
carrinho_minutos       = 20       esfriamento antes de considerar abandonado
intervalo_grupos_min   = 60       segundos entre grupos
intervalo_grupos_max   = 120
intervalo_partes       = 2        segundos entre partes da mesma mensagem
marca_nome             = Vitorine
marca_cor              = #050505
marca_remetente        = Painel Adm Vitorine
marca_site            = https://vitorine.com.br
yampi_alias            = vitorine3
```

### Variáveis de ambiente (nomes; valores ficam no `.env`, modo 600)

```
EVOLUTION_API_KEY  EVOLUTION_URL  EVOLUTION_INSTANCE
POSTGRES_PASSWORD  PAINEL_USUARIO  PAINEL_SENHA
APP_PORT  TZ  DB_PATH  MIDIA_PATH  BACKUP_PATH
JANELA_INICIO  JANELA_FIM  TETO_DIARIO  TETO_PARTES
INTERVALO_MIN_SEG  INTERVALO_MAX_SEG  MAX_TENTATIVAS  RETRY_ESPERA_MIN
GRUPO_TESTE  TELEFONE_TESTE
SMTP_HOST  SMTP_PORT  SMTP_USER  SMTP_PASS  SMTP_DE
```

---

## 5. O painel

Navegação em três módulos (`views/layout.ts`):

**Topo:** Instâncias · Personalização · Integrações · Sair

**AUTOMAÇÕES**
- Fluxos (`/painel/fluxos`) — agrupados por tipo de gatilho, com o mapa visual
  do fluxo e o construtor de mensagem

**GERENCIADOR DE GRUPOS**
- Novo disparo · Mensagens · Agendamento · Disparos (histórico) · Grupos · Comunidades

### Rotas (75 no total)

Automações: `/painel/fluxos`, `/painel/fluxos/:id`, `.../ligar`, `.../passos`,
`.../passos/:pid`, `.../apagar`, `.../apagar-tudo`, `/painel/fluxos/novo`,
`/painel/modelos`, `/painel/modelos/:id`, `.../partes`, `.../partes/:pid`,
`.../montar`, `.../apagar`

Integrações: `/painel/integracoes`, `.../carrinho`, `.../carrinho/agora`,
`.../campanha`, `.../evento/:id`

Webhooks: `POST /webhook/yampi`, `POST /webhook/evolution`

Grupos: `/painel/novo`, `/painel/novo/confirmar`, `/painel/mensagens`,
`/painel/agendamento`, `/painel/historico`, `/painel/grupos`,
`/painel/comunidades`, `/painel/disparos/:id/{cancelar,duplicar,apagar}`,
`/painel/destinos/:id/reenviar`, `/painel/grupos/bloquear-todos`

Instância: `/painel/instancia/:nome/{qr,rotulo,desconectar,remover}`,
`/painel/instancia/novo`, `/painel/ritmo`

Conta: `/entrar`, `/entrar/codigo`, `/recuperar`, `/recuperar/trocar`, `/sair`

Saúde: `/saude`

> Existem ~15 rotas legadas da Fase 1 (`/disparos`, `/grupos`, `/eventos`,
> `/regras`, `/conexao/*`, `/teste/*`) que ainda respondem e deveriam ser
> removidas.

---

## 6. Automações — como funcionam

### Gatilhos disponíveis

| Chave | Rótulo | Origem |
|---|---|---|
| `yampi.cart.reminder` | Carrinho abandonado | Yampi |
| `yampi.order.created` | Pedido criado | Yampi |
| `yampi.order.paid` | Pedido aprovado | Yampi |
| `yampi.order.status.updated` | Status do pedido mudou | Yampi |
| `yampi.order.updated` | Pedido alterado | Yampi |
| `yampi.transaction.payment.refused` | Pagamento recusado | Yampi |
| `yampi.cashback.expiring` | Cashback vencendo | Yampi |

### Variáveis disponíveis nas mensagens

Cliente: `{{nome}}` `{{nome_completo}}` `{{email}}` `{{telefone}}`

Carrinho: `{{resumo}}` (bloco pronto com produtos, desconto, frete e total)
`{{itens}}` `{{itens_curto}}` `{{primeiro_produto}}` `{{itens_qtd}}`
`{{subtotal_reais}}` `{{desconto}}` `{{desconto_reais}}` `{{frete_reais}}`
`{{valor}}` `{{valor_reais}}` `{{link}}` `{{cupom}}` `{{cupom_valor_reais}}`
`{{cupom_descricao}}`

Pedido: `{{pedido}}` `{{forma_pagamento}}` `{{status}}` `{{cliente_id}}`

Cashback: `{{cashback_valor}}` `{{cashback_valor_reais}}`
`{{cashback_expira_em_br}}` `{{cashback_dias}}` `{{cashback_saldo}}`

### Tipos de passo

`mensagem` · `esperar` · `condicao` · `consulta` (chamada HTTP)

Operadores de condição: `eq` `ne` `contem` `maior` `menor` `existe` `vazio`

### O motor (`auto/motor.ts`) — o que é importante saber

- **É linear.** `receita.find(p => p.ordem === ex.passo_atual)`. Uma condição só
  *continua* ou *encerra* — **não existe ramificação**. Transformar o motor em
  grafo é o próximo passo de arquitetura acordado.
- **Identidade do caso:** `carrinho:<token>#<sha1_8>`, onde o hash cobre o
  conteúdo (`sku_id x quantidade` ordenados, mais o total). É isso que permite
  o mesmo carrinho disparar de novo quando o cliente **muda o conteúdo**.
- **`uma_por_cliente`:** abre a execução nova **antes** de cancelar as antigas.
  A ordem inversa já causou perda de disparo em produção.
- **Quarentena por reentrada** (`reentrada_min`) vale igual em modo teste —
  modo teste troca o *destino* das mensagens, não as regras.
- **Janela de horário por passo** (`janela_inicio` / `janela_fim`), teto diário,
  intervalo entre partes e entre grupos, retry com espera.

### Modo teste

O fluxo em `modo: teste` manda tudo para `TELEFONE_TESTE`
(o número pessoal do Gabriel), **independente** de quem é o cliente do
carrinho. As regras de negócio continuam valendo.

---

## 7. Integração com a Yampi

Loja: alias `vitorine3`. Credenciais em `ajustes` (`yampi_chave`, `yampi_token`,
`yampi_segredo` para validar HMAC do webhook sobre o corpo cru).

### Webhooks que realmente chegam (medido)

```
22  cart.reminder          último: 28/09 01:08
 9  order.created          último: 28/09 10:01
 8  order.status.updated   último: 28/09 10:02
 7  order.paid             último: 28/09 10:02
 1  cashback.expiring      25/09 14:53
```

`cart.reminder` **dispara de verdade**, mesmo com os e-mails de recuperação
desativados na Yampi (origem `18.228.135.79`), entre 11 e 29 minutos depois da
**criação** do carrinho — não do último toque.

### Fatos da API medidos na prática (economizam horas)

| Fato | Consequência |
|---|---|
| `date=updated_at:` é **silenciosamente ignorado** — sempre filtra por `created_at` | não dá para buscar carrinhos por data de alteração |
| o endpoint de **lista ignora `include=promocode`** | cupom só aparece em `GET /checkout/carts/{id}` (um por um) |
| `totalizers.discount` é **sempre 0** em carrinho abandonado | nem cupom, nem campanha, nem pix aparecem ali |
| há **~16 min de atraso** antes da API refletir a edição do cliente | não adianta consultar imediatamente |
| `search.data.has_shipment_service` | é o que separa "frete grátis" de "frete não calculado" |
| `updated_at.timezone` do carrinho | vem em `America/Sao_Paulo` |

### A regra de preço (reconstruída, conferida em 23 de 23 pedidos reais)

```
produtos
  → campanha        (30% da unidade mais barata, por par elegível)
  → cupom           ('v' = valor fixo | 'p' = percentual sobre produtos)
  → se o cupom tem accumulate:false E valor > 0, ele SUBSTITUI a campanha
  → desconto limitado ao valor de produtos
total = produtos − desconto + frete
```

Os **5% do Pix ficam deliberadamente de fora**: o checkout só aplica depois que
o cliente escolhe Pix.

A campanha de kit é uma **categoria do catálogo**:
`"Compre 1 | 2º Par 30% Off"`. Resolvida em uma chamada via
`GET /catalog/skus/{id}?include=product.categories`, com cache de 7 dias na
tabela `skus_campanha`. Quando não dá para saber, retorna `null` — **nunca
adivinha**.

---

## 8. Templates das mensagens de WhatsApp

Estão em `modelos` + `partes` + `botoes`. Três modelos hoje, todos de carrinho.
Cópia literal do que está no banco:

### Modelo 3 — "Carrinho: primeiro lembrete"

**Parte 1** · tipo `produtos` (renderiza as fotos e os preços dos itens)
```
Oi {{nome}}, você deixou isso no carrinho:
```

**Parte 2** · tipo `texto`
```
Ele continua salvo:

{{resumo}}

Se ficou dúvida de numeração ou de prazo de entrega, é só responder nesta conversa que eu te ajudo.
```
Botão URL: **Voltar ao carrinho** → `{{link}}`

### Modelo 4 — "Carrinho: reforço"

**Parte 1** · tipo `texto`
```
{{nome}}, seu carrinho continua guardado:

{{resumo}}

O estoque, porém, é o mesmo da loja inteira: o número que você escolheu pode acabar antes de você voltar.
```
Botão URL: **Finalizar compra** → `{{link}}`

### Modelo 5 — "Carrinho: última chamada"

**Parte 1** · tipo `texto`
```
{{nome}}, esta é a última mensagem sobre esse carrinho.

Se você mudou de ideia sobre o {{primeiro_produto}}, tudo bem, não insisto mais.

Se foi dúvida de numeração, me responde aqui: eu prefiro te ajudar a escolher o número certo do que você receber um par que não serve.
```
Botão URL: **Ver meu carrinho** → `{{link}}`

### Como `{{resumo}}` sai na prática

```
• Sapato Loafer Masculino Tratorado Louis Café 40 · R$ 247,00

Produtos: R$ 247,00
Frete: R$ 14,90
Total: R$ 261,90
```

Com campanha, a linha do item mostra o preço riscado:
`~R$ 237,00~ R$ 165,90`. Com cupom, entra uma linha nomeando o cupom e o valor,
igual ao checkout da Yampi.

### Tipos de parte que o construtor aceita

`texto` · `imagem` · `video` · `audio` · `bolinha` (nota de voz) · `gif` ·
`documento` · `carrossel` · `produtos`

Regras aprendidas na prática, que o construtor já respeita:
- botão junto de mídia só funciona com **imagem**
- o carrossel **nunca** pode ser a parte 1
- áudio perde a menção
- visualização única não existe na Evolution
- carrossel aceita até 10 fotos, um botão por card

---

## 9. O único fluxo montado hoje

```
fluxo 15 · "Carrinho abandonado"
  gatilho: yampi.cart.reminder
  modo: TESTE        uma conversa por cliente: SIM
  encerra quando chega: yampi.order.paid

  ordem 1  mensagem   modelo 3 (primeiro lembrete)
  ordem 2  esperar     180 s
  ordem 3  mensagem   modelo 4 (reforço)
  ordem 4  esperar     300 s
  ordem 5  mensagem   modelo 5 (última chamada)
```

As esperas são curtas e **não há janela de horário** porque este é o fluxo de
teste. Em produção: janela 09:00–20:00 e esperas de horas, não minutos.

### Resultado real do fim de semana

```
exec 32  concluída   28/09 00:42   (cancelou a exec 31, mesmo cliente)
exec 31  cancelada   28/09 00:42   substituída por um caso mais novo
exec 29  concluída   27/09 16:12
exec 28  concluída   27/09 16:07
exec 26  concluída   27/09 10:06
exec 25  concluída   26/09 02:05
```

56 entregas, **todas com status `aceita`, zero falha**. Todas para o
`TELEFONE_TESTE`, como esperado no modo teste. A cadeia inteira — webhook da
Yampi → esfriamento → preço → fingerprint → motor → Evolution → WhatsApp —
está funcionando ponta a ponta.

---

## 10. Destinos e travas de segurança

### Instância de WhatsApp

Uma só: `vitorine` ("Sac Vitorine"), `connectionStatus: open`. O sistema
suporta várias — cada grupo dispara pelo número dele (`grupo_instancia`).

O número pessoal do Gabriel **não deve ser pareado** como instância.

### Grupos cadastrados

| Tipo | Nome | Membros | Ativo |
|---|---|---|---|
| comunidade | `#01 Vitorine ⚡️` | 251 | sim |
| grupo | `#02 Vitorine ⚡️` | 83 | sim |
| comunidade | `TESTE NOVA COMUNIDADE` | 4 | sim |
| grupo | `ENVIO TESTE GRUPO VIP` | 2 | sim |
| pai | `#01 Vitorine ⚡️` | 2 | bloqueado |
| pai | `TESTE NOVA COMUNIDADE` | 1 | bloqueado |

O "pai" de uma comunidade **nunca recebe disparo**. Comunidade e grupo são
telas e disparos separados.

### Travas que precisam continuar valendo

- teste vai só para `ENVIO TESTE GRUPO VIP` e a comunidade de teste; a guarda
  exige a palavra **TESTE** no assunto buscado
- `#01` e `#02 Vitorine` **não recebem disparo sem ordem explícita**
- 21 grupos de marca de terceiros (~6.021 pessoas) **jamais** podem receber
- um fluxo **não sai de teste para produção sem ordem explícita**
- a configuração ao vivo da Yampi é **somente leitura**

---

## 11. Backup

`/opt/grupo-vip/backup.sh`, no cron **todo dia às 04:00** (fora da janela de
disparo). Guarda **14 gerações** em `dados/backups/<timestamp>/`:

- `evolution.sql.gz` — dump do Postgres da Evolution
- `instances.tar.gz` — a sessão do WhatsApp (o volume `evolution_instances`)
- `app.db` — via `snapshot.cjs`, **com o WAL aplicado**
  (`cp` simples no SQLite leva um banco atrasado)
- `midias.tar.gz` · `marca.tar.gz`
- cópia do `.env` e do `docker-compose.yml`

Restauração: `/opt/grupo-vip/restaurar.sh`.

Limpeza semanal de mídia órfã: domingo 04:30, carência de 7 dias.

> **Nunca testado:** restaurar um backup num servidor limpo. Isso é o que
> valida se o backup presta.
> **Cuidado documentado:** restaurar um backup pode reenviar disparo.

---

## 12. O que está pronto

- Login por e-mail com código em aparelho novo; sessão em cookie `gg_sessao`
- Marca branca: nome, logo, cor e fundo por cliente
- Gerenciador de grupos: disparo em partes, botões, carrossel, agendamento,
  histórico, reenvio por destino, sincronização de grupos (grupo novo entra
  **bloqueado**)
- Webhook da Evolution com status real de entrega (o painel dava verde em grupo
  que o WhatsApp havia recusado; o `ERROR` só chega por webhook)
- Motor de automação linear com janela, teto, intervalo, retry, quarentena e
  cancelamento por telefone
- Integração Yampi: 7 gatilhos, HMAC sobre o corpo cru, varredura de carrinhos
  a cada 5 min com botão "buscar agora" no painel
- Cálculo de preço fiel ao checkout, incluindo campanha de kit e cupom
- Construtor de mensagem compartilhado (canvas estilo Reportana) com prévia,
  usado pelos fluxos e pelas mensagens reutilizáveis
- Mapa visual do fluxo, com conectores em CSS que viram verticais abaixo de
  780 px
- Backup diário com WAL aplicado e limpeza de mídia órfã

## 13. O que falta

**Arquitetura**
1. **Motor linear → grafo.** Sem isso não existe ramificação de verdade, nem o
   nó de condição com dois caminhos.
2. **Canal de e-mail.** Já é a razão pela qual o construtor virou canvas.
3. **Colocar o código em git.** Hoje não há histórico nem rollback.
4. `BLOCOS_1A1` importa `BLOCOS` de `painel/novo.ts` — a dependência aponta para
   o lado errado; o catálogo deveria morar em `painel/construtor.ts`.
5. Remover as ~15 rotas legadas da Fase 1.

**Funcionalidades**
6. Atualizar as variáveis do carrinho **na hora do envio**, para a 2ª e a 3ª
   mensagem refletirem um cupom aplicado no meio da sequência.
7. Rastreio: usar `track_code` / `track_url` da Yampi; página pública de
   rastreio; integração Frenet.
8. Código Pix copia-e-cola na mensagem.
9. Casar pedido com carrinho por `cart_token`.
10. Webhook de tag do Shopify.
11. Os demais fluxos de exemplo (pagamento recusado, pós-compra, recompra,
    cashback vencendo).

**Produto / operação**
12. Instalador que gera segredos novos para cada cliente.
13. Checklist de entrega no `OPERACAO.md`.
14. **Testar a restauração de backup num servidor limpo.**
15. Migrar para Hostinger São Paulo na produção.

---

## 14. Documentação que já existe

`OPERACAO.md` (637 linhas) — manual de operação em português, escrito para
alguém que não é programador. Seções: o que é o servidor, como entrar, comandos
do dia a dia, o que fazer quando a sessão do WhatsApp cai, backup e restauração,
como fechar o servidor, atualizar a Evolution, limites de envio, formatos que dá
para enviar, e uma lista do que **nunca** fazer.
