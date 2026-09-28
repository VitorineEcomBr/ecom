# Auditoria da Martz e especificação do CRM de Retenção Vitorine

*Versão 3 — 28/09/2026 · baseada na leitura integral da central de ajuda da Martz (118 artigos, 16 seções) e no levantamento real do servidor (`docs/estado-atual-crm-vitorine.md`)*

---

## 0. De onde vem cada informação

| Fonte | Situação |
|---|---|
| Central de ajuda `ajuda.martz.com.br` | **Lida por inteiro**: 118 artigos, 16 seções. É a base desta versão. |
| Painel logado `painel.martz.com.br` | **Não acessado.** O navegador desta sessão não consegue abrir o painel. Pontos que só o painel mostra estão marcados **[conferir no painel]**. |
| O seu sistema | Levantado no servidor em 28/09 (`docs/estado-atual-crm-vitorine.md`). O código mora em `/opt/grupo-vip/app/src`, sem git, não neste repositório. |

Não estão publicados na central: as fases de estratégia 2, 4, 5, 6, 7 e 8
(Resgate, Giftback, Promoções, Cross-sell, Aniversário VIP e Saudades VIP) e
nenhum artigo sobre **gerar imagem com IA no editor de e-mail**. Esse recurso
você viu no painel, mas a Martz não documenta. **[conferir no painel]**

### ⚠️ Correção importante em relação à versão 1

A Martz **tem as duas conexões de WhatsApp**: a API Oficial (Meta) **e** um
número não oficial conectado por QR Code, igual ao WhatsApp Web. O seu
diferencial não é ter as duas. O diferencial real é a **gestão de Grupos VIP**,
que a Martz não tem, somada ao que está na seção 8.

---

## 1. Mapa completo de menus da Martz

Reconstruído a partir dos caminhos citados nos artigos.

```
PAINEL (painel.martz.com.br)
│
├── Indicadores
│   ├── Dashboards personalizáveis (3 modelos prontos + montagem livre)
│   ├── Visão Geral
│   ├── Análise RFM
│   ├── Análise de Vendas
│   ├── Análise de Retenção (com coorte)
│   ├── Análise de Campanhas (inclui custo dos disparos)
│   └── Análise de Clientes (inclui "saúde dos cadastros")
├── Analytics ............... funil do site (precisa do Martz Tag Manager)
├── Clientes
│   ├── Clientes (quem tem pedido) / Leads (quem não tem)
│   ├── Grupos de clientes .. 29 categorias · 119 filtros
│   ├── RFM
│   └── Importar (planilha modelo)
├── Campanhas
│   ├── Campanha da Loja ..... 15 tipos
│   └── Campanha de Vendedores
├── Planejar
│   └── Pop-ups ............. captação de lead
├── Executar
│   └── Atividades .......... todos os disparos de todas as campanhas
├── Modelos de email ........ Meus modelos · Pré-definidos · Kit da marca · Meus arquivos
├── Pesquisas ............... NPS, CSAT, texto…
├── Atendimento ............. inbox de WhatsApp + Martin (IA)
├── Carteira (/wallet) ...... saldo pré-pago de e-mail e SMS
└── Configurações
    ├── WhatsApp → Telefones Oficiais · Modelos de Mensagem · número não oficial (QR)
    ├── Integrações → E-commerces · ERPs · E-mail · Chatbots
    ├── Chaves de acesso (URL de webhook)
    ├── Tag Manager
    ├── Configurar remetente (e-mail) · E-mail → Supressões
    ├── Atendimento → Equipe · Setores · Tags de Atendimento · Configurações Gerais
    ├── Macros
    ├── Loja & Equipe → Vendedores · Unidades da Loja
    ├── Gestão de Colaboradores (usuários do painel)
    └── Tags

PAINEL DO VENDEDOR (vendedor.martz.com.br) — aplicativo separado
├── Minhas ações ....... calendário de tarefas
├── Meus clientes ...... carteira com abas de RFM
└── Meus indicadores
```

---

## 2. Módulo por módulo

### 2.1 Integrações de loja (só Shopify e Yampi, no seu caso)

**Shopify — como a Martz faz:**
- O lojista cria um **app no Dev Dashboard da Shopify**, instala na loja e cola
  **Client ID + Secret + nome da loja** (`nomedaloja.myshopify.com`) na Martz.
- Webhooks na versão `2025-10`, com uma lista longa de permissões: pedidos,
  clientes, checkouts, descontos com escrita, pixels, produtos e outras.
- Um webhook extra, criado à mão em *Configurações → Notificações → Webhooks*,
  para o evento de **processamento do pedido**, que traz o rastreio. Ele aponta
  para `storesync.martzapis.com.br/notifies/shopify/{id}`.
- A primeira sincronização leva até 1h para começar. Enquanto sincroniza, a
  integração mostra o status "Parcialmente".

**Yampi — como a Martz faz:**
- Credenciais **Alias + Token + Chave Secreta**, sem escolha de permissões:
  elas dão acesso a tudo.
- O histórico é puxado **dia a dia**, porque a API da Yampi limita o tamanho de
  cada resposta. Base grande demora.
- Webhooks na Yampi, criados à mão: **Pedido criado**, **Status do pedido
  atualizado** e **Carrinho abandonado**, apontando para a URL que a Martz mostra
  em *Chaves de acesso*.

**Outras integrações que existem (fora do seu escopo agora):** Bagy, Braavo,
Magazord, Nuvemshop, Shoppub, Tray, Vnda, WBuy, WooCommerce, Yever; ERPs Bling,
Omie e Tiny; e-mail Perfit (e Klaviyo e ActiveCampaign citados); chatbots Nextags
e Pagebot.

**Lições para o seu CRM:**
1. Faça **backfill + webhook + reconciliação** (a Martz tem um status
   "Parcialmente" justamente porque sincroniza em lotes).
2. Na Yampi, puxe o histórico em fatias de um dia, com fila e retomada.
3. Na Shopify, prefira um **app próprio da loja** (custom app) a pedir ao lojista
   dezenas de permissões. Para uso só da Vitorine, bastam: pedidos, clientes,
   checkouts, produtos, fulfillments e descontos (escrita).
4. **Deduplicação:** a Martz usa o **CPF/CNPJ** como chave principal do cliente e
   mescla quem tem o mesmo documento. Sem documento, duplica. Use documento, com
   telefone e e-mail como chaves reserva.

### 2.2 Clientes, Leads e Grupos

- **Cliente** é quem tem pelo menos um pedido. **Lead** é quem não tem (veio de
  pop-up, importação ou cadastro manual).
- **Importação por planilha:** só dados de contato, nunca histórico de compras.
  O telefone precisa ter 11 dígitos, sem 55 e sem pontuação. Exige associar uma
  tag ou um grupo. Linhas inválidas são descartadas sem aviso linha a linha.
- **Habilitar/desabilitar cliente:** desabilitado nunca recebe campanha, em
  nenhum canal.
- **Atributos customizados** de cliente, pedido, carrinho e produto, usados em
  filtros e variáveis.
- **Grupos de clientes**:
  - Atualização **em tempo real** (entra e sai sozinho) ou **sem atualização**
    (foto do momento em que foi criado).
  - Visibilidade: só para mim ou para todos os colaboradores.
  - Lógica **E / OU / NÃO**, com contagem de clientes ao vivo em cada condição.

**Os 29 grupos de filtros (119 filtros no total):**

| # | Categoria | Exemplos |
|---|---|---|
| 1 | Recência | comprou nos últimos X dias; não compra há X meses; última compra entre X e Y dias |
| 2 | Frequência | comprou pelo menos / exatamente / no máximo X vezes; nunca comprou |
| 3 | Valor | gastou mais de / até / entre |
| 4 | RFM | pertence / não pertence aos segmentos |
| 5 | Ticket médio | maior / menor / entre |
| 6 | Tags | tem / não tem |
| 7 | Categoria | comprou / não comprou das categorias |
| 8 | Produto | comprou / não comprou; por nome; quantidade entre X e Y |
| 9 | Desconto | com / sem desconto; com / sem cupons X |
| 10 | Frete | frete pago / grátis |
| 11 | Data do pedido | período; meses; dias do mês; dias da semana; faixa de horário |
| 12 | Status do pedido | status padronizado (PAID, PENDING…) ou status original da loja |
| 13 | Data de cadastro | período; entre X e Y dias |
| 14 | Forma de pagamento | comprou / não comprou com |
| 15 | Aniversário | mês; data; ano; sem data; **signo** |
| 16 | Localização | estado / cidade (pago ou qualquer status) |
| 17 | Campanha | está / não está; atividades enviadas, entregues, lidas, com falha, atrasadas, engajadas; usou bônus da campanha |
| 18 | Canal do pedido | site, app, marketplace, loja física |
| 19 | Newsletter | inscrito / não inscrito no pop-up X |
| 20 | Carrinho | abandonou; carrinho com produtos / categorias X |
| 21 | Atributos | 12 filtros sobre atributos customizados |
| 22 | Vendedor | comprou com; está na carteira de |
| 23 | Pesquisa | respondeu; resposta X; avaliou produto; promotor / detrator; anônima |
| 24 | Documento | tem CPF / CNPJ |
| 25 | Telefone | tem / não tem |
| 26 | E-mail | tem / não tem |
| 27 | Integração | cadastrado pela integração X |
| 28 | Bônus | tem bônus válido |
| 29 | Fidelidade | pontos; tier; resgatou / acumulou nos últimos X dias |

### 2.3 Matriz RFM

- Recência, Frequência e Valor divididos em **quintis** (nota de 1 a 5 cada).
- Recalculada **uma vez por dia, no fim do dia**.
- **11 segmentos:** Campeões · Clientes fiéis · Fiéis em potencial · Novos
  clientes · Promessas · Precisam de atenção · Quase dormentes · Em risco ·
  Não pode perder · Hibernando · Perdidos recentemente.
- Aparece em Clientes → RFM, em Indicadores → Análise RFM, na ficha do cliente,
  no atendimento e no painel do vendedor.

### 2.4 Campanhas — o motor

**Os 15 tipos de campanha da loja:**

| Tipo | Gatilho | Entrada recomendada pela Martz |
|---|---|---|
| Boas-Vindas | primeira compra (pedido pago ou pendente) | uma única vez |
| Saudades | sem comprar há X dias (+ "última compra a partir de" para não pegar a base toda) | intervalo de 2.160h (90 dias) |
| Aniversariante do Dia | aniversário hoje, ou daqui a X dias | intervalo de 8.760h |
| Aniversariante do Mês | aniversário no mês | intervalo de 8.760h |
| Status do Pedido | pedido entrou no status X (+ 22 filtros) | infinitas vezes |
| Pós-Venda | critérios do pedido (+ 20 filtros) | infinitas vezes |
| Resgate (Pix/Boleto) | último pedido pendente ou cancelado, X min depois, forma de pagamento | intervalo de 24h |
| Recuperação de Pedidos | pagamento pendente | intervalo |
| Carrinho Abandonado | carrinho abandonado há X min (recomendado 10–15) | intervalo de 24h |
| Comunicação | cliente pertence aos grupos (disparo segmentado) | uma única vez |
| Aniversário da 1ª Compra | primeira compra há X dias | uma única vez |
| Comunicação com Assinantes | inscrição no pop-up X, com data | uma vez ou máximo |
| Avaliação | respondeu à pesquisa X, pela campanha Y, com data | uma vez ou máximo |
| Lembrete de Bônus | bônus válido: campanha de origem, validade, tipo, valor | uma vez ou máximo |
| Recuperação de Bônus | bônus **expirado**: gera um novo ou reativa | uma vez ou máximo |

**Filtros do gatilho de Status do Pedido / Pós-Venda:** status; valor ≥ e ≤;
tem / não tem produtos (um, todos, nenhum); categorias; formas de pagamento;
estados; data de/até; canais; cupons usados; tem código ou link de rastreio;
é a primeira compra; fretes; vendedor.

**Assistente de criação em 7 passos:**
1. **Parâmetros**:
   - nome, data de início (lida para trás: **data no passado busca clientes
     antigos**) e data de término;
   - "Seus clientes podem entrar": uma única vez · infinitas vezes · máximo de N
     vezes · em um intervalo de N horas;
   - interruptor **"Permitir somente clientes que deram o aceite"** (LGPD);
   - interruptor **"Cálculo preditivo"**: liga a receita por janela de 48h (ver 2.10).
2. **Tipo**.
3. **Gatilho** (varia por tipo; Comunicação não tem).
4. **Público**: incluir grupos e excluir grupos.
5. **Bônus** (ver 2.7).
6. **Pesquisa** vinculada, enviada automaticamente a quem entra.
7. **Ações**, uma ou mais por campanha, cada uma com:
   - **Canal:** WhatsApp (não oficial) · WhatsApp Oficial · SMS · E-mail ·
     Chatbot & Automação (Nextags, Pagebot).
   - **Tipo de texto:** predefinições prontas por tipo de campanha (ex.:
     "Carrinho com bônus"), **IA Personalizada** ou Customizada.
   - **Condição de disparo = D + N dias +** uma destas: a partir da entrada ·
     a partir da data da compra · se o pedido for pago · bônus utilizado · bônus
     não utilizado · realizou compras após entrar · **não realizou compras após
     entrar** · não pagou o pedido após entrar.
   - **Só existe espera em dias.** Não há espera em minutos ou horas dentro da
     régua. O D+0 sai perto da hora da entrada; o D+1 em diante começa à 00:00.
   - **Modo:** Automático, ou **Semi-automático**, em que a mensagem fica
     pendente e alguém clica "Enviar", que abre o WhatsApp com o texto pronto,
     um a um.
   - **Opções avançadas:** dias da semana · janela de horário · **limite de
     atraso** (horas após a criação; passou, não envia) · **limite diário de
     envios da ação**.
   - Mídia: imagem, vídeo, áudio (só MP3) e documento. Envio de teste para o
     próprio celular.
   - Botão de **pausar só a ação**: os clientes continuam entrando, mas não recebem.

**Operação de campanhas:** editar, **clonar**, pausar, excluir. Ao reativar uma
campanha pausada, **ela recupera os clientes do período pausado**. Para evitar
isso, a Martz manda clonar a campanha com uma nova data de início.

**Ponto fraco da Martz (confirmado na ajuda):** a elegibilidade é avaliada **só
na entrada** da campanha, não de novo no envio. A exceção é a condição "não
realizou compras".

### 2.5 Atividades (fila de disparos)

Cada mensagem é uma "atividade" com estes status:

`A executar → Aguardando envio → Enviada → Entregue → Lida / Não lida → Completa`,
e os desvios **Atrasada**, **Contato inválido**, **Falha / Não entregue** e
**Suprimida** (opt-out, LGPD ou duplicado).

- Tela global em *Executar → Atividades* e tela por campanha, com filtro por
  campanha, status e período.
- **"Ver detalhes"** mostra o erro exato devolvido pela Meta (código + texto).
- Quando o número atinge o limite diário, no dia seguinte a Martz envia primeiro
  as mensagens ainda dentro do prazo e depois as atrasadas.
- **Números não oficiais também têm um limite diário de segurança.**

### 2.6 WhatsApp

**Oficial (Cloud API):**
- Conexão por **Embedded Signup** ("Continuar com o Facebook"), no modelo **OBO**:
  a conta WABA fica no Business Manager do lojista e a cobrança da Meta vai no
  cartão do lojista, **em USD**.
- A Martz recomenda um **chip dedicado** e desaconselha a **Coexistência**
  (usar o mesmo número no app e na API) para disparos.
- Migrar de outra ferramenta (Reportana, Klaviyo…): é preciso liberar o número
  na outra conta, e **templates e nome de exibição não vêm junto**.

**Modelos de mensagem (templates):**

| Formato | Cabeçalho | Corpo | Rodapé | Botões |
|---|---|---|---|---|
| Texto | texto (≤60, 1 variável) | ≤1.024 | ≤60, sem variável | — |
| Mídia | imagem / vídeo / documento (≤50 MB, imagem 1.125×600) | ✅ | ✅ | — |
| Resposta Rápida | texto | ✅ | ✅ | 1–3 (≤25 caracteres) |
| Chamada para Ação | texto | ✅ | ✅ | até 4: URL fixa, **URL dinâmica**, ligação, **copiar cupom**, **descadastro** |
| Carrossel | — | — | — | 2 a 10 cards, mesma mídia e proporção, texto do card de 3 a 160 caracteres |
| Detalhes do Pedido (Pix) | texto | ✅ | ✅ | ✅ (a Meta precisa liberar) |

- Categorias: Marketing, Utilidade e Serviço.
- Botão **"Sincronizar modelos"** para trazer os criados direto na Meta.
- Status: em análise, aprovado, reprovado.
- **Mapeamento na ação:** cada `{{1}}`, `{{2}}` do template é ligado a um campo
  da Martz. O cabeçalho tem numeração própria, separada da do corpo.
- **Ajuda para ser aprovado como Utilidade:** a Martz aponta um GPT externo
  ("WA Template Wizard") e dá regras de redação:
  - sem perguntas;
  - sem "aproveite", "gostaríamos", "convidamos";
  - nome da loja no meio do texto, nunca no fim;
  - evitar emoji;
  - apagar templates rejeitados.

**Não oficial (QR Code):**
- Cai quando o celular fica sem bateria ou sem internet, ou quando a Meta
  desconecta. Para reconectar, **exclua o número e leia um QR novo**; não dá para
  reconectar por cima.

**Erros da Meta que a Martz documenta:**

| Erro | Causa | O que fazer |
|---|---|---|
| 131049 "healthy ecosystem" | limite de marketing **por destinatário**, somando todas as empresas | esperar 24–48h, reenviar com intervalo crescente |
| — | **Máximo de 2 templates de marketing por usuário a cada 24h** por empresa | resposta do cliente abre janela e zera a contagem |
| 131026 / undeliverable | número sem WhatsApp, app antigo, termos não aceitos | nenhuma |
| 131042 | problema de pagamento na Meta | pagar ou cadastrar cartão internacional em USD no portfólio |
| 132012 | template desatualizado | recriar |
| Spam rate limit | muitas denúncias | parar marketing no número, usar só transacional |
| Re-engagement | janela de 24h fechada | só template pago |

### 2.7 Bônus (cupom, cashback, giftback, frete grátis)

- **Tipos:** valor fixo · percentual fixo · **cashback** (% da compra anterior,
  só nas campanhas de Status do Pedido e Pós-Venda) · frete grátis.
- **Campos:**
  - compra mínima para ganhar;
  - valor ou %, com teto em R$;
  - validade em dias;
  - **multiplicador de uso** (bônus × N = compra mínima para usar);
  - intervalo mínimo entre bônus do mesmo cliente;
  - limite de bônus no período.
- **Interruptores:** só primeira compra · cumulativo com promoções · só o próprio
  cliente pode usar · **não gerar novo bônus em compra que usou bônus** ·
  cumulativo com produtos em promoção.
- A Martz **cria o cupom na loja** pela API, com código único por cliente.
- **Ciclo completo:** gera (Pós-Venda) → **Lembrete de Bônus** (condição "bônus
  não utilizado") → **Recuperação de Bônus** (depois de expirar).

### 2.8 E-mail

- **Editor de arrastar blocos.** As abas Conteúdo, Blocos, Corpo, Imagens,
  Uploads e Auditoria são as do Unlayer, então provavelmente é ele embutido.
- **Banco de fotos gratuitas** (Unsplash, Pexels, Pixabay), aba **Auditoria**
  (links quebrados, imagem sem texto alternativo), prévia desktop e mobile,
  envio de teste.
- **Bloco de produtos dinâmico:** mostra a foto e os itens do carrinho abandonado.
- **Kit da marca:** cola a URL do site e ele importa logo e cores. Logo para fundo
  claro e escuro, fontes.
- **Modelos pré-definidos:** Abandono de carrinho · Aniversário · Boas-vindas ·
  Promocionais · Confirmação de pedido · Cross-sell & Upsell · Blocos.
- **Configurações:** assunto e pré-cabeçalho com variáveis, nome do remetente,
  Reply-To, CC (a Martz alerta contra CC em disparo de massa), versão em texto
  puro automática.
- **Remetente:** autenticação de domínio (SPF, DKIM, DMARC) ou remetente único
  verificado.
- **Supressões automáticas:** bounce permanente, reclamação de spam e
  descadastro. Variável `{{link-descadastro}}`.
- **Custo:** o plano inclui uma cota. Acima dela, **R$ 0,01 por e-mail**, debitado
  de uma carteira pré-paga. Com fatura em aberto, **o canal some** da criação de
  campanha.
- Recomendação da Martz: no máximo **5 e-mails por cliente por dia**.
- **Geração de imagem com IA:** não aparece na documentação. **[conferir no painel]**

### 2.9 SMS

Um SMS tem 160 caracteres, ou 70 se houver acento ou emoji. Acima disso vira
SMS concatenado. Usa as mesmas variáveis do WhatsApp. É um plano adicional.

### 2.10 Indicadores, Analytics e atribuição

**Dashboards:** montagem livre em quadros, mais 3 modelos prontos (Vendas,
Recompra, Monitoramento de Campanhas).

| Visão | Métricas |
|---|---|
| Visão Geral | Receita geral · **Receita pela Martz** · ticket médio · LTV · nº de clientes · vendas · frequência · tempo médio entre pedidos · novos vs recorrentes · vendas vs ticket |
| Vendas | itens vendidos · por forma de pagamento · uso de cupons · **por faixa etária** · por estado / cidade · top categorias e produtos · **curva ABC** · carrinhos abandonados · cancelados |
| Retenção | taxa de retenção · tempo até a 2ª compra · tempo entre compras · recompra em 30/60/90 dias · **coorte** · retenção vs ticket |
| Campanhas | receita e pedidos gerados · engajamento · top campanhas · evolução no tempo · **custo por período** |
| Clientes | total · novos · ativos (<90 dias) · inativos · evolução · geografia · cadastros incompletos · **saúde do cadastro (0–10)** |

**Resultado de cada campanha:**
- Big numbers: receita, pedidos, ticket, % da receita total.
- Carrinho: abandonados, recuperados, valor recuperado e taxa de recuperação,
  com e sem bônus.
- Bônus: receita, "margem investida", "ROI", desconto efetivo, gerado vs
  resgatado, tempo médio até o uso.
- Mensagens: enviadas, entregues, lidas, não entregues.

**Atribuição:**
- **Direta:** o pedido usou um bônus da Martz.
- **Indireta (48h):** pedido pago até 48h depois de uma mensagem. **Só conta se a
  flag "Cálculo preditivo" da campanha estiver ligada.**
- Carrinho abandonado atribui pelo link do carrinho.
- **UTMs automáticas** em todo link: `utm_source=martz`,
  `utm_medium=whatsapp|email`, `utm_campaign=<campanha>`.

**Analytics do site:** exige o **Martz Tag Manager**. Pode reaproveitar os
eventos de e-commerce do GA4 que já estão no GTM, ou usar a própria API
`window.mzDataLayer` com os eventos `pageview`, `viewItem`, `addToCart`,
`removeFromCart`, `beginCheckout`, `purchase` e `search`. Alimenta sessões,
conversão, funil e dispositivos.

### 2.11 Pop-ups (captação de leads)

Editor em 7 seções:
1. **Informações:** nome, título, subtítulo, **tag automática**, ativo sim/não.
2. **Campos:** nome, e-mail, WhatsApp, CPF/CNPJ, nascimento, checkbox de aceite.
3. **Layout do formulário.**
4. **Imagem:** topo, esquerda, direita ou fundo, com tamanhos indicados.
5. **Tela de sucesso.**
6. **Exibição:** largura, páginas permitidas e bloqueadas (a bloqueada vence).
7. **Disparo:** imediato · atraso · inatividade · rolagem · botão flutuante ·
   uma vez · até preencher. Frequência por hora, dia ou mês, controlada por cookie.

Instala com um `<script>` antes do `</body>`, com passo a passo para Shopify e
Yampi. Quem se inscreve vira **Lead** e pode entrar numa campanha
"Comunicação com Assinantes".

### 2.12 Pesquisas

- **Configuração:** título, cores, descrição, reCAPTCHA, embaralhar perguntas,
  pedir e-mail, "só em campanhas".
- **Tipos de pergunta:** texto curto, NPS, CSAT com emojis e outros; imagem por
  pergunta; página final com redirecionamento.
- **Envio:** vinculada a uma campanha (variável `{{link-pesquisa}}`) ou por botões
  de Resposta Rápida no template (Ótima / Regular / Ruim).
- **Depois da resposta:** a campanha **Avaliação** dispara conforme a resposta, e
  existem filtros por promotor ou detrator.

### 2.13 Atendimento (inbox)

- **Equipe:** até 500 tickets simultâneos por atendente, horário individual,
  ligação com um vendedor.
- **Setores:** distribuição em rodízio (**Round Robin**).
- **Tags** coloridas.
- **Configurações gerais:** setor padrão, janela de conversa (ex.: 2 dias), fuso,
  tempo de resposta exibido, horário de atendimento com resposta automática fora
  do horário, por setor.
- **Tela em 3 colunas:**
  - Entrada: todas · minhas · não atribuídas · por setor.
  - Chat: nota interna, áudio, **macros com `/`** e variáveis, botão "Modelos"
    quando a janela de 24h fecha.
  - Ficha do cliente: RFM, pedidos, campanhas, anotações, histórico de conversas.
- Ações na conversa: prioridade, importante, encerrar, apagar.

### 2.14 Martin — a IA da Martz

**O que é:** um **agente de atendimento** no WhatsApp Oficial. É um **módulo
adicional pago**, liberado depois de avaliação comercial.

**Arquitetura (descrita pela própria Martz):**

```
mensagem do cliente
      │
 COORDENADOR ── identifica a intenção e aciona o especialista
      │
 ┌────┴────────┬──────────┬──────────┬──────────────┐
 Base de       Catálogo   Cross-sell  Pedidos        Escalação
 Conhecimento  (busca de  (1 sugestão (só leitura,   & Handover
 (busca        produto)   por conversa; confirma CPF
 híbrida)                 nunca com    + 2º dado)
                          cliente irritado)
      │
 JUIZ DE QUALIDADE — nota em 5 aspectos (fidelidade à fonte, segurança, tom,
                     completude, escalação); abaixo de 0,70 → escala, tenta de
                     novo ou sugere ao atendente
      │
 TERMÔMETRO DE FRUSTRAÇÃO (verde, amarelo, vermelho) → escala sozinho
```

- **Modos:**
  - **Copiloto:** sugere a resposta como nota interna.
  - **Autônomo:** responde sozinho, com **~60s para desfazer**.
  - **Desligado.**
  - O modo pode ser escolhido por setor, o que permite um piloto num setor de teste.
- **Configuração:** persona, tom (formal, neutro ou casual), criatividade
  (recomendado 0,3) e **system prompt com "Fonte da Verdade"**: números oficiais
  (frete, prazos, trocas) que valem mais que a base de conhecimento.
- **Base de conhecimento:** artigos em MD e importação de PDF e documentos, com
  **busca híbrida** (por significado e por palavra).
- **Regras fixas:**
  - nunca fala de estoque;
  - nunca promete reembolso, cupom ou troca;
  - CPF sempre mascarado;
  - cancelamento sempre vai para um humano.
- **Gatilhos de escalação:**
  - termos jurídicos (PROCON, Reclame Aqui), chargeback, extravio, reembolso,
    pedido de humano, repetição sem resolução;
  - listas extras por segmento. Para **moda e calçados**: defeito de costura,
    troca por tamanho, caimento.
- **Depois do atendimento:** pesquisa "Resolveu?" ao fechar o ticket e
  auditoria do motivo de cada escalação.

**IA nas campanhas:** a opção de texto "**IA Personalizada**" gera a mensagem
da ação. Não há mais detalhes publicados. **[conferir no painel]**

**O que a Martz não tem publicado como IA:** análise de dados ou relatório com
IA. O "analista" que você chamou de Martin Análise não aparece na documentação.
**[conferir no painel]**

### 2.15 Vendedores (CRM do vendedor)

- **Vendedor:** login por CPF/CNPJ, comissão, unidade ou filial.
- **Carteira:** grupo por filtros com os mesmos filtros de segmentação.
  **Distribuição automática em rodízio** a cada cliente novo ou pedido novo, e
  vendedor "sem categoria" como reserva.
- **Campanha de Vendedores:** carteira **E** grupo **E** gatilho. Pode enviar
  sozinha ou **criar uma tarefa** para o vendedor, com mensagem sugerida e botão
  copiar.
- **Painel do Vendedor:**
  - calendário de ações (atrasadas em vermelho), agrupar por cliente;
  - tarefa manual para um cliente ou para um grupo inteiro;
  - "Meus clientes" com abas de RFM;
  - botão "Contato via WhatsApp";
  - indicadores individuais.
- É o que a Martz usa nas fases **"Aniversário VIP"** e **"Saudades VIP"**, em
  que o contato com o cliente VIP é feito por uma pessoa, via vendedor.

### 2.16 Configurações gerais

Usuários do painel (criar, editar função/acesso, habilitar, desabilitar,
excluir), tags, chaves de acesso, remetente de e-mail, supressões, Tag Manager,
vendedores e unidades, e a carteira de créditos.

---

## 3. Estratégia-modelo que a Martz entrega aos lojistas

Ordem recomendada de implantação:
1. **Status do pedido** (Utilidade, a mais barata) — confirmado · enviado com
   rastreio · entregue com pesquisa em D+1.
2. **Boas-vindas** — 4 e-mails em D+0, D+2, D+6 e D+10, só e-mail.
3. **Resgate** — carrinho e Pix/boleto (maior retorno imediato).
4. **Pop-up** — e-mail em D+0 + WhatsApp de marketing em D+0 + e-mail em D+2 +
   WhatsApp em D+4, parando quando o lead compra.
5. **Giftback e cross-sell** (carrossel).
6. **Aniversário e Saudades**, com Recuperação de Bônus e VIP tratado por um vendedor.
7. **Pesquisa e promoções** — piloto antes de escalar.

**Regras que a Martz repete em todos os artigos:**
- transacional vai em Utilidade (grátis dentro da janela de 24h); oferta vai em
  Marketing, com segmentação;
- terminar com um botão de resposta abre a janela de 24h e barateia o resto da
  régua;
- a Meta pode reclassificar Utilidade como Marketing, então conte com esse custo.

---

## 4. O que já existe no seu sistema (medido no servidor em 28/09)

Fonte: `docs/estado-atual-crm-vitorine.md`.

| Camada | Estado real |
|---|---|
| Stack | Node 22 · Fastify 5 · TypeScript strict · HTMX · **SQLite (better-sqlite3, WAL)** · Evolution API (Baileys) |
| Infra | Contabo Europa (teste) → **Hostinger São Paulo** planejado para produção · Docker Compose · **Caddy com HTTPS** em `painel.vitorine.com.br` · DNS Cloudflare |
| Código | 71 arquivos, 13.158 linhas, **só no servidor, sem git** |
| Login | e-mail + código em aparelho novo · 1 usuário |
| Marca branca | nome, logo, cor e fundo configuráveis. **Pensado para vender como produto** |
| Grupos VIP | em produção: partes, botões, carrossel, agendamento, histórico, reenvio, sincronização (grupo novo entra bloqueado), ritmo por número |
| Automações | **motor de fluxos** (gatilho + passos) em modo teste, funcionando de ponta a ponta |
| Yampi | 7 gatilhos, HMAC sobre o corpo cru, varredura de carrinhos a cada 5 min, **cálculo de preço fiel ao checkout** (campanha de kit + cupom, conferido em 23 de 23 pedidos) |
| Construtor | canvas estilo Reportana, compartilhado entre fluxos e mensagens; 9 tipos de parte, incluindo `produtos` |
| Entregas | webhook da Evolution com status real (o `ERROR` só chega por webhook) |
| Backup | diário às 04:00, 14 gerações, WAL aplicado; **nunca testado num servidor limpo** |

---

## 5. Encaixe módulo a módulo: Martz × o que você já tem

Legenda: ✅ pronto · 🟡 parcial · ❌ não existe · ⛔ não se aplica.

### 5.1 Campanhas da Martz → Fluxos do seu sistema

O seu **Fluxo** (gatilho + passos) já é o equivalente da **Campanha** da Martz.
Não é preciso criar um motor novo: basta estender o que existe.

| Tipo de campanha Martz | No seu sistema | O que falta para encaixar |
|---|---|---|
| Carrinho Abandonado | ✅ fluxo 15 (`yampi.cart.reminder`), em teste | janela 09–20 e esperas em horas para ir a produção; **atualizar variáveis no envio** (item 6 da sua lista) |
| Resgate (Pix/Boleto) e Recuperação de Pedidos | 🟡 gatilho `payment.refused` e `order.created` existem, sem fluxo | fluxo "pedido criado e não pago em X min"; **Pix copia-e-cola** (item 8) |
| Status do Pedido | 🟡 gatilho `order.status.updated` existe | filtro por status no gatilho; **rastreio** `track_code`/`track_url` (item 7) |
| Pós-Venda | 🟡 gatilho `order.paid` existe | filtros do pedido (valor, produto, categoria, pagamento, estado, primeira compra) |
| Lembrete de Bônus | 🟡 gatilho `cashback.expiring` já chega, **com o cashback nativo da Yampi** | só montar o fluxo |
| Boas-Vindas | ❌ | precisa saber se é a **primeira compra**, ou seja, precisa da base de pedidos (5.2) |
| Saudades · Aniversário do Dia/Mês · Aniversário da 1ª Compra | ❌ | gatilhos **por tempo**: agendador diário varrendo a base de clientes (5.2) |
| Comunicação (disparo segmentado) | ❌ | precisa de grupos de clientes (5.3); é o "Novo disparo" do VIP, só que 1:1 |
| Comunicação com Assinantes | ❌ | pop-up (fase posterior) |
| Avaliação | ❌ | pesquisas (fase posterior) |
| Recuperação de Bônus | ⛔ por ora | só faz sentido com motor de bônus próprio (ver 5.7) |

**Recursos da ação/campanha da Martz × os seus passos:**

| Recurso Martz | No seu sistema |
|---|---|
| Espera só em **dias** | ✅ **melhor**: `esperar` em segundos |
| Condição "não realizou compras após entrar" | ✅ **melhor**: o fluxo **encerra quando chega** `order.paid` (evento, não verificação na hora) |
| Entrada: uma vez / infinitas / máximo / intervalo | 🟡 `uma_por_cliente` + quarentena `reentrada_min`; falta "máximo de N vezes" |
| Janela de horário | ✅ por passo |
| Dias da semana | ❌ |
| **Limite de atraso** (expira a mensagem) | ❌ |
| Limite diário da ação | 🟡 teto diário global |
| Modo semi-automático | ❌ |
| Público: incluir / excluir grupos | ❌ (depende de 5.3) |
| Filtros do gatilho (22 no Status do Pedido) | ❌ o passo `condicao` cobre parte |
| Pausar só uma ação | ❌ |
| Clonar campanha | ❌ |
| Ramificação | ❌ em ambos. **A Martz também não ramifica**: as ações são independentes. O seu **motor em grafo** vira diferencial |
| Consulta HTTP no meio do fluxo | ✅ passo `consulta`. **A Martz não tem** |

### 5.2 Clientes, pedidos e dados — a maior lacuna

Hoje o sistema **reage a eventos** mas **não guarda uma base de clientes e
pedidos**: só existe `eventos_recebidos`. Sem essa base não há Boas-Vindas,
Saudades, aniversário, RFM, filtros, indicadores nem atribuição.

| Martz | Seu sistema | Encaixe |
|---|---|---|
| Clientes / Leads | ❌ | tabelas `clientes`, `pedidos`, `itens_pedido`, alimentadas pelos webhooks que já chegam |
| Backfill do histórico | ❌ | puxar da API da Yampi **em fatias diárias** (a própria Martz faz assim por causa do limite da API), com retomada |
| Deduplicação | ❌ | chave CPF, com telefone E.164 e e-mail de reserva |
| Casar pedido ↔ carrinho | ❌ (item 9) | por `cart_token`: é isso que dá **atribuição direta** de recuperação |
| Atributos customizados | ❌ | tabela chave→valor por cliente e pedido |
| Importar planilha | ❌ | P3 |

### 5.3 Segmentação

| Martz | Seu sistema | Encaixe |
|---|---|---|
| RFM (quintis, 11 segmentos, diário) | ❌ | job diário em SQL. O SQLite tem `NTILE()`, sem precisar de Postgres |
| Grupos de clientes (29 categorias, 119 filtros, E/OU/NÃO) | ❌ | começar com 10 categorias: recência, frequência, valor, RFM, produto, categoria, cupom, forma de pagamento, estado, aniversário; + **"está no Grupo VIP"** |
| Tags | ❌ | tabela simples |

### 5.4 Atividades

| Martz | Seu sistema |
|---|---|
| Tela única de atividades, 11 status, "ver detalhes" do erro | 🟡 os dados existem (`execucoes`, `execucao_passos`, `entregas`, webhook da Evolution), falta **uma tela única** e **status padronizados**: a executar · aguardando · atrasada · contato inválido · enviada · entregue · lida · falha · suprimida · completa |

### 5.5 WhatsApp

| Martz | Seu sistema | Encaixe |
|---|---|---|
| Não oficial (QR) | ✅ Evolution, com **ritmo por número** (a Martz só tem limite diário) | manter |
| API Oficial + templates (6 formatos) | ❌ | novo **canal** ao lado da Evolution em `envio.ts`; tabela de templates Meta; o passo `mensagem` escolhe o canal |
| Construtor | ✅ canvas com 9 tipos, incluindo `produtos` (a Martz não tem) | para o Oficial, um editor de template com as regras da Meta (cabeçalho ≤60, corpo ≤1.024, variáveis numeradas) |

### 5.6 Variáveis

As suas variáveis de carrinho são **mais ricas que as da Martz**: `{{resumo}}`
com preço riscado, campanha de kit e cupom. Faltam: rastreio, link e código
Pix, link da pesquisa, bônus próprio e `{{link}}` com UTM.

### 5.7 Bônus

A Yampi já tem **cashback nativo**, e o gatilho `cashback.expiring` já chega.
Recomendação: **usar o cashback da Yampi** e não construir um motor de bônus
agora. Cupom único por cliente, criado pela API da Yampi, entra só quando um
fluxo precisar.

### 5.8 Demais módulos

| Martz | Seu sistema | Prioridade |
|---|---|---|
| Indicadores (5 visões) + resultado por campanha | ❌ (depende de 5.2) | P1 |
| Atribuição 48h + UTMs | ❌ | P1: com `cart_token` você terá atribuição **direta**, melhor que a janela de 48h |
| E-mail (editor, domínio, supressões) | ❌ (SMTP só para o código de login) | P2: já planejado, o construtor virou canvas por isso |
| IA (Martin) | ❌ | P2: Redator e Analista com Claude |
| Shopify | ❌ (item 10: webhook de tag) | P2 |
| Pop-up · Pesquisas · Inbox de atendimento | ❌ | P3 |
| Colaboradores e funções | 🟡 login por e-mail, 1 usuário | P3 (necessário ao vender) |
| **Marca branca** | ✅ **a Martz não tem** | diferencial para vender |
| Vendedores e carteiras | ⛔ operação de uma pessoa | descartar |
| SMS | ⛔ | descartar por ora |
| **Grupos VIP** | ✅ **a Martz não tem** | manter como está |

---

## 6. Arquitetura: manter a stack atual

A versão anterior desta auditoria recomendava Postgres e BullMQ. **Com o
levantamento real, a recomendação muda:**

| Decisão | Por quê |
|---|---|
| **Manter Fastify + TypeScript + HTMX + SQLite** | o sistema funciona de ponta a ponta. Uma loja do porte da Vitorine gera milhares de pedidos por ano, não milhões; SQLite em WAL dá conta com folga, inclusive do RFM com `NTILE()` |
| Postgres **só se** virar SaaS multi-loja | o "instalador que gera segredos novos para cada cliente" (item 12) aponta para **uma instalação por cliente**. Nesse modelo, cada cliente tem o próprio SQLite e não é preciso multi-tenant |
| Fila no próprio banco | o motor já agenda passos no SQLite; basta acrescentar os status de atividade e a expiração |
| **Camada de canais** em `envio.ts` | uma interface `enviar(canal, destino, mensagem)`: Evolution (já existe), Meta Oficial, e-mail. O Grupo VIP continua chamando a Evolution como hoje |
| WhatsApp Oficial com **WABA do próprio cliente** | uma instalação por cliente = cada cliente conecta a sua WABA com token de usuário de sistema; **sem virar Tech Provider da Meta** |
| E-mail por **Amazon SES** (ou Resend) | nunca direto do IP da VPS |
| Caddy + HTTPS | ✅ já existe |
| Backup **fora da VPS** | hoje as 14 gerações moram no mesmo disco |

---

## 7. Claude no lugar do Martin

A IA da Martz é, na prática, **atendimento**. A sua pode cobrir mais frentes:

| Agente | O que faz | Modelo sugerido |
|---|---|---|
| **Analista** (o que você chamou de "Martin Análise") | toda semana lê os indicadores e escreve o que mudou, por quê e as 3–5 ações; responde perguntas como "por que a recompra caiu?" | Opus para o relatório; Sonnet para perguntas |
| **Redator** ("IA Personalizada") | escreve as partes da mensagem no construtor, no tom Vitorine, usando só as variáveis que existem para aquele gatilho | Sonnet |
| **Revisor de template Meta** (substitui o GPT externo que a Martz indica) | antes de enviar para aprovação, aplica as regras de Utilidade e reescreve | Sonnet |
| **Diretor de arte** | escreve o prompt da imagem; um **modelo de imagem** (Nano Banana ou GPT Image) gera; a imagem entra no construtor. O Claude não gera imagens | Sonnet + API de imagem |
| **Segmentador** | transforma uma frase em grupo de clientes ("comprou mocassim, não voltou em 90 dias") usando os filtros como ferramentas | Sonnet com tool use |
| **Atendente** (fase posterior) | copia a arquitetura do Martin: coordenador + especialistas + juiz + termômetro de frustração, com copiloto antes do autônomo | Sonnet (juiz em Haiku) |

**Regras de construção:**
- A chamada ao Claude sai **só do backend**, com a chave no `.env`.
- O agente recebe **números agregados**, nunca a base crua.
- A voz da marca (a sua skill de persona) entra como system prompt com cache.
- No atendente, adotar as regras do Martin: Fonte da Verdade, nada de estoque,
  CPF mascarado, cancelamento vai para um humano, **janela de 60s para desfazer**.

---

## 8. Onde você já está ou pode ficar à frente da Martz

**Já está à frente:**
1. **Grupos VIP** com ritmo por número e regras de formato.
2. **Marca branca**, essencial para vender.
3. **Espera em segundos** dentro da régua (a Martz só tem dias).
4. **Encerrar o fluxo por evento** (`order.paid`) no lugar de uma verificação
   agendada.
5. **Preço do carrinho fiel ao checkout**, com campanha de kit e cupom.
6. **Tipo de parte `produtos`** com fotos e preços.
7. **Passo `consulta`** (chamada HTTP no meio do fluxo).
8. **Identidade do carrinho por conteúdo**: o cliente que troca o produto recebe
   de novo, sem duplicar.

**Pode ficar à frente com o que já está planejado:**
1. **Motor em grafo**, com ramificação real. A Martz não tem.
2. **Variáveis recalculadas no envio**: resolve o ponto fraco que a própria
   Martz admite, de avaliar o cliente só na entrada.
3. **Atribuição direta por `cart_token`**, mais honesta que a janela de 48h.
4. **Grupos VIP ligados ao CRM**: filtro "está no VIP", convite automático para
   Campeões, receita do grupo com cupom exclusivo.
5. **Grupo de controle** para medir a receita que a campanha realmente adiciona.
6. **Contagem de mensagens de marketing por cliente** antes de enviar pelo Oficial.
7. **Analista com Claude**, que a Martz não tem publicado.

---

## 9. Riscos atuais do seu sistema

| # | Ponto | Risco | Ação |
|---|---|---|---|
| 1 | **Código sem git** | uma edição errada não tem volta; o único ponto de recuperação é o backup diário | **antes de qualquer mudança**: repositório privado no GitHub |
| 2 | Restauração **nunca testada** | o backup pode não prestar | testar num servidor limpo; fazer junto com a migração para a Hostinger |
| 3 | Backup no mesmo disco | perder a VPS = perder tudo | cópia diária automática para fora (B2 ou S3) |
| 4 | Restaurar pode **reenviar disparo** | cliente recebe de novo | ao restaurar, subir com todos os fluxos e disparos pausados |
| 5 | Evolution `2.4.0-rc2` | versão de teste em produção | fixar numa estável, com backup antes |
| 6 | Contabo na Europa | latência | migração para Hostinger SP já decidida |
| 7 | Sem base de clientes/pedidos | não dá para ter RFM, filtros, indicadores | fase 2 do roteiro |
| 8 | Sem limite de atraso | mensagem presa sai fora de contexto | expirar a atividade |
| 9 | Sem lista de descadastro | quem pediu para sair continua recebendo | tabela de opt-out + palavras "SAIR", "PARAR" |
| 10 | ~15 rotas legadas respondendo | superfície de ataque sem uso | remover |
| 11 | Dependência invertida `BLOCOS` | acoplamento entre telas | mover o catálogo para `construtor.ts` |
| 12 | Mensagens pedem "responda nesta conversa" | respostas chegam num número que ninguém vigia pelo painel | vigiar o celular do Sac até existir inbox |

---

## 10. Roteiro de construção (encaixado no que existe)

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **0 · Base segura** | git + repositório privado; backup fora da VPS; remover rotas legadas; corrigir `BLOCOS` | `git log` com o código atual; backup aparecendo no armazenamento externo |
| **1 · Carrinho em produção** | variáveis recalculadas no envio; limite de atraso; dias da semana; janela 09–20 e esperas em horas; **sair do modo teste só com a sua ordem** | 1 semana em produção sem mensagem fora de janela nem duplicada |
| **2 · Base de dados da loja** | `clientes`, `pedidos`, `itens`; backfill Yampi em fatias diárias; deduplicação; casar `cart_token` | total de pedidos do painel batendo com a Yampi no mesmo período |
| **3 · Fluxos transacionais** | filtros no gatilho; tela única de Atividades; fluxos: Pix/pagamento recusado, status + rastreio, pós-compra, cashback vencendo | cada fluxo testado no `TELEFONE_TESTE` |
| **4 · Motor em grafo** | nó de condição com dois caminhos, migrando o fluxo 15 sem mudar o comportamento | fluxo 15 idêntico antes e depois |
| **5 · Segmentação** | RFM diária, grupos de clientes, gatilhos por tempo (saudades, aniversário), comunicação segmentada, **filtro "está no VIP"** | grupo "Campeões" com contagem conferida à mão |
| **6 · Indicadores** | receita recuperada (atribuição direta), por fluxo, recompra, coorte simples | receita atribuída conferida pedido a pedido numa semana |
| **7 · WhatsApp Oficial** | canal Meta, templates, sincronização, status de entrega e qualidade | template aprovado e entregue num número de teste |
| **8 · Claude** | Redator no construtor, Analista semanal, Revisor de template | relatório semanal gerado com dados reais |
| **9 · E-mail** | canal de e-mail no construtor, SES, domínio, descadastro | e-mail de carrinho entregue na caixa principal, não no spam |
| **10 · Shopify e captação** | webhooks da Shopify, pop-up, pesquisas | — |
| **11 · Produto** | instalador, colaboradores com funções, checklist de entrega, migração para Hostinger SP com restauração testada | instalação limpa de ponta a ponta num servidor novo |

A ordem prioriza receita: o carrinho vai para produção na fase 1, e os fluxos
de Pix, rastreio e pós-compra vêm logo depois, a mesma ordem que a própria
Martz recomenda aos lojistas.

---

## 11. Decisões que são suas

1. **Modelo de produto:** uma instalação por cliente (o que o instalador
   sugere, e o que recomendo) ou SaaS multi-loja? Isso decide se o SQLite fica
   para sempre ou se um dia vai para Postgres.
2. **Número do WhatsApp Oficial:** chip novo, dedicado. O Sac Vitorine está na
   Evolution: se migrar para a API Oficial, **para de funcionar** nos grupos.
3. **Papel da Shopify:** a loja é Shopify com checkout Yampi? Quais eventos
   devem vir de cada uma?
4. **Bônus:** usar só o cashback nativo da Yampi (recomendado agora) ou
   construir um motor próprio de bônus?
5. **Provedor de e-mail** e **modelo de imagem**.
6. **Quando o fluxo de carrinho sai do modo teste**, e com quais horários e esperas.

---

## 12. O que ainda falta conferir no painel

Pode ser feito por prints ou pelo Claude no Chrome, quando houver créditos.

1. Onde fica e como funciona a **geração de imagem com IA** no e-mail.
2. O que a opção **"IA Personalizada"** pede e entrega nas ações.
3. Se existe alguma **análise com IA** nos indicadores.
4. As **predefinições de texto** de cada tipo de campanha (vale copiar a lista).
5. A tela de **número não oficial**: limite diário, e se há intervalo entre
   mensagens.
6. As fases de estratégia não publicadas (2, 4, 5, 6, 7 e 8).

---

## Fontes

Central de Ajuda da Martz — coleções lidas por inteiro:
[Campanhas](https://ajuda.martz.com.br/pt-BR/collections/10178109-campanhas) ·
[Clientes](https://ajuda.martz.com.br/pt-BR/collections/10178108-clientes) ·
[Indicadores](https://ajuda.martz.com.br/pt-BR/collections/10178107-indicadores) ·
[WhatsApp](https://ajuda.martz.com.br/pt-BR/collections/10178159-whatsapp) ·
[Atividades](https://ajuda.martz.com.br/pt-BR/collections/10963310-atividades) ·
[Bônus](https://ajuda.martz.com.br/pt-BR/collections/11063636-bonus) ·
[Boas Práticas](https://ajuda.martz.com.br/pt-BR/collections/11663297-boas-praticas) ·
[Pesquisa](https://ajuda.martz.com.br/pt-BR/collections/12042291-pesquisa) ·
[Pop-up](https://ajuda.martz.com.br/pt-BR/collections/12042947-pop-up) ·
[E-mail](https://ajuda.martz.com.br/pt-BR/collections/17933150-e-mail) ·
[SMS](https://ajuda.martz.com.br/pt-BR/collections/18989756-sms) ·
[Atendimento](https://ajuda.martz.com.br/pt-BR/collections/19630239-atendimento) ·
[Painel do Vendedor](https://ajuda.martz.com.br/pt-BR/collections/19631210-painel-do-vendedor) ·
[Martin Agentes](https://ajuda.martz.com.br/pt-BR/collections/19700219-martin-agentes) ·
[Integrações](https://ajuda.martz.com.br/pt-BR/collections/10167858-integracoes) ·
[Configurações Gerais](https://ajuda.martz.com.br/pt-BR/collections/10178156-configuracoes-gerais)

Artigos-chave:
[Como criar uma campanha](https://ajuda.martz.com.br/pt-BR/articles/10166717-como-criar-uma-campanha) ·
[Variáveis](https://ajuda.martz.com.br/pt-BR/articles/14441402-variaveis-disponiveis-nas-acoes-de-campanhas) ·
[Condições de disparo](https://ajuda.martz.com.br/pt-BR/articles/14068397-condicoes-de-disparo) ·
[Filtros de segmentação](https://ajuda.martz.com.br/pt-BR/articles/14116712-filtros-de-segmentacao-de-clientes) ·
[Modelos na API Oficial](https://ajuda.martz.com.br/pt-BR/articles/10577887-criando-um-modelo-de-mensagem-na-api-oficial) ·
[Falhas no envio](https://ajuda.martz.com.br/pt-BR/articles/13240702-principais-motivos-de-falhas-no-envio) ·
[Bônus](https://ajuda.martz.com.br/pt-BR/articles/10227621-como-configurar-bonus-em-campanhas) ·
[Indicadores](https://ajuda.martz.com.br/pt-BR/articles/11832971-como-funcionam-os-indicadores-da-martz-crm) ·
[Atribuição 48h](https://ajuda.martz.com.br/pt-BR/articles/16516891-atribuicao-de-receita-calculo-preditivo-48h-e-por-que-a-receita-gerada-aparece-zerada) ·
[Martin — visão geral](https://ajuda.martz.com.br/pt-BR/articles/16089774-martin-atendimento-visao-geral-e-ordem-de-configuracao) ·
[Shopify](https://ajuda.martz.com.br/pt-BR/articles/9746926-shopify) ·
[Yampi](https://ajuda.martz.com.br/pt-BR/articles/14604771-yampi)
