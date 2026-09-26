# Auditoria da Martz e especificação do CRM de Retenção Vitorine

*Versão 2 — 26/09/2026 · baseada na leitura integral da central de ajuda da Martz (118 artigos, 16 seções)*

---

## 0. De onde vem cada informação

| Fonte | Situação |
|---|---|
| Central de ajuda `ajuda.martz.com.br` | **Lida por inteiro**: 118 artigos, 16 seções. É a base desta versão. |
| Painel logado `painel.martz.com.br` | **Não acessado.** O navegador desta sessão não consegue abrir o painel. Pontos que só o painel mostra estão marcados **[conferir no painel]**. |
| O seu sistema do Grupo VIP | Analisado pelo `OPERACAO.md`. O código mora em `/opt/grupo-vip` na Contabo, não neste repositório. |

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

## 4. O que já existe no seu sistema (Grupo VIP)

A partir do `OPERACAO.md`:

| Recurso | Situação |
|---|---|
| Evolution API `2.4.0-rc2` + app próprio + SQLite | em produção na Contabo |
| Até 2 números não oficiais, cada grupo com o seu número | ✅ |
| Disparo em até 4 partes: texto, imagem, vídeo, GIF, áudio ptt, vídeo bolinha, carrossel com até 10 cards | ✅ |
| Parte 1 nunca é carrossel nem áudio (garante a notificação por menção) | ✅ regra no banco |
| Espaçamento por número (piso de 15s), janela de horário, teto diário, tentativas | ✅ |
| Agendamento e Histórico, duplicar e cancelar | ✅ |
| Backup diário com a API online do SQLite (14 cópias) | ✅ |
| Integração Yampi | ✅ em testes |
| SSH só por chave, UFW, fail2ban | ✅ |

**Comparado com a Martz:** a disciplina de envio por número e as regras de
formato para grupos são **mais sofisticadas que o disparo não oficial da Martz**,
que só tem um limite diário genérico.

---

## 5. Tabela de paridade — o que construir

| Módulo da Martz | Você tem? | Prioridade |
|---|---|---|
| Integração Yampi | ✅ **em testes** — manter, só complementar | **P0** (concluir testes) |
| Integração Shopify (backfill, webhooks, reconciliação) | ❌ | **P0** |
| Clientes / Leads / deduplicação por CPF | ❌ | **P0** |
| Grupos com filtros E/OU/NÃO (começar pelas 15 categorias mais usadas) | ❌ | **P0** |
| RFM diária com 11 segmentos | ❌ | **P0** |
| Motor de campanhas: 15 tipos, 7 passos, condições, janela, limite de atraso, limite diário | ❌ | **P0** |
| Atividades com 11 status e "ver detalhes" | parcial (histórico de grupos) | **P0** |
| WhatsApp Oficial: conexão, templates (6 formatos), mapeamento de variáveis, sincronização | ❌ | **P0** |
| WhatsApp não oficial 1:1 (Evolution) | parcial (só grupos) | P1 |
| Bônus: 4 tipos, multiplicador, lembrete, recuperação, cupom único na loja | ❌ | **P1** |
| Indicadores: 5 visões + resultado por campanha + atribuição + UTMs | ❌ | **P1** |
| E-mail: editor de arrastar blocos, kit da marca, domínio, supressões | ❌ | P1 |
| Pop-up de captação | ❌ | P2 |
| Pesquisas + campanha Avaliação | ❌ | P2 |
| Atendimento (inbox) | ❌ | P2 |
| IA de atendimento (Martin) | ❌ | P3 |
| Vendedores, carteiras e painel do vendedor | ❌ | P3 (só se tiver equipe) |
| Tag Manager e Analytics do site | ❌ | P3 |
| SMS | ❌ | P3 |
| **Grupos VIP** | ✅ | manter |

---

## 6. Arquitetura proposta na Contabo

```
                         Internet (HTTPS · Caddy)
                                  │
     ┌────────────────┬───────────┼──────────────┬─────────────────┐
  painel web     /webhooks/*   /p/pesquisa   /popup.js        /t (links + UTM)
                Shopify·Yampi
                Meta·Evolution
                    SES
     └────────────────┴──────► API (app) ◄──────┴─────────────────┘
                                  │
             ┌────────────────────┼─────────────────────┐
         Postgres               Redis              Workers (BullMQ)
      (dados do CRM)          (filas)     sync · RFM · motor · envio · IA · e-mail
                                                     │
          ┌─────────────────┬────────────────────────┼──────────────┬──────────┐
     Meta Cloud API   Evolution API            Amazon SES      Claude API   modelo de
     (1:1 oficial)    (grupos + 1:1)           (e-mail)        (IA)         imagem
```

| Decisão | Por quê |
|---|---|
| **Postgres** para o CRM | vários escritores ao mesmo tempo, filtros pesados (os 119 filtros viram SQL), RFM com `NTILE(5)` |
| Postgres separado do da Evolution | atualizar a Evolution não pode arriscar os dados de clientes |
| **Filas por número e por canal** | o espaçamento que você já faz nos grupos vira regra para todo envio não oficial |
| **Caddy + HTTPS** | Shopify, Yampi e Meta só entregam webhook em HTTPS público |
| Login por usuário, com funções | a Martz tem gestão de colaboradores; o seu painel hoje tem uma senha única |
| **Backup fora da VPS** (B2 ou S3) | hoje o backup mora no mesmo servidor |
| WhatsApp Oficial **direto na sua WABA** (token de usuário de sistema) | a Martz usa Embedded Signup e OBO porque atende muitas lojas. Para uma loja só, você não precisa ser Tech Provider da Meta |
| E-mail pelo **Amazon SES** | a Martz cobra R$ 0,01 por e-mail; o SES custa uma fração disso. **Nunca envie e-mail direto do IP da VPS** |
| Editor de e-mail **Unlayer** (ou GrapesJS + MJML) | é, muito provavelmente, o mesmo que a Martz usa |

Tamanho de VPS: com Postgres, Redis, Evolution, app e workers, **8 GB de RAM** é
o mínimo confortável.

---

## 7. Claude no lugar do Martin

A IA da Martz é, na prática, **atendimento**. A sua pode cobrir quatro frentes:

| Agente | O que faz | Modelo sugerido |
|---|---|---|
| **Analista** (o que você chamou de "Martin Análise") | toda semana lê os indicadores e escreve o que mudou, por quê e as 3–5 ações; responde perguntas como "por que a recompra caiu?" | Opus para o relatório; Sonnet para perguntas |
| **Redator** ("IA Personalizada") | escreve a ação da campanha no tom Vitorine, WhatsApp e e-mail, com variáveis corretas para o tipo de campanha | Sonnet |
| **Revisor de template Meta** (substitui o GPT externo que a Martz indica) | antes de enviar para aprovação, aplica as regras de Utilidade e reescreve | Sonnet |
| **Diretor de arte** | escreve o prompt da imagem; um **modelo de imagem** (Nano Banana ou GPT Image) gera; a imagem entra no bloco do e-mail ou no cabeçalho do template. O Claude não gera imagens | Sonnet + API de imagem |
| **Segmentador** | transforma uma frase em grupo ("comprou mocassim, não voltou em 90 dias") usando os 119 filtros como ferramentas | Sonnet com tool use |
| **Atendente** (fase posterior) | copia a arquitetura do Martin: coordenador + especialistas + juiz + termômetro de frustração, com copiloto antes do autônomo | Sonnet (juiz em Haiku) |

**Regras de construção:**
- A chamada ao Claude sai **só do backend**.
- O agente recebe **números agregados**, nunca a base crua.
- A voz da marca (a sua skill de persona) entra como system prompt com cache.
- No atendente, adotar as regras do Martin, que são boas: Fonte da Verdade,
  nada de estoque, CPF mascarado, cancelamento vai para um humano, **janela de
  60s para desfazer**.

---

## 8. Onde dá para ser melhor que a Martz

1. **Grupos VIP integrados ao CRM:** cruzar participantes com clientes; filtros
   "está / não está no VIP"; campanha "convidar Campeões para o VIP"; receita do
   grupo com cupom exclusivo.
2. **Reavaliar a elegibilidade no envio, não só na entrada.** A Martz admite que
   não faz: quem já pagou pode receber "seu Pix vai vencer".
3. **Espera em minutos e horas dentro da régua.** A Martz só tem dias, então
   carrinho em 30 min + 4h + 24h é impossível lá.
4. **Grupo de controle** (ex.: 10% dos elegíveis não recebem) para medir a
   receita realmente adicionada, e não só a janela de 48h.
5. **Pausar sem pegar clientes retroativos**, como opção na própria tela, sem
   precisar clonar.
6. **Contagem de marketing por cliente.** Respeitar o limite da Meta de 2
   templates de marketing em 24h **antes** de enviar, em vez de receber o erro
   131049.
7. **Pausa automática por qualidade** do número oficial (a Martz só documenta
   como corrigir depois).
8. **Analista com IA**, que a Martz não tem publicado.
9. **Custo menor de e-mail** com SES direto.

---

## 9. Riscos atuais do seu sistema

| # | Ponto | Risco | Ação |
|---|---|---|---|
| 1 | Evolution `2.4.0-rc2` | versão de teste em produção | fixar numa estável, com backup antes |
| 2 | Backup só na VPS | perder a VPS = perder tudo | cópia diária automática para B2 ou S3 |
| 3 | Senha única do painel no `.env` | sem usuário por pessoa e sem registro de ações | login com funções + log de auditoria |
| 4 | Painel só por túnel SSH | webhooks exigem HTTPS público | Caddy + subdomínio |
| 5 | SQLite | não aguenta a carga do CRM | CRM em Postgres; Grupo VIP migra depois |
| 6 | Limite de 2 números | CRM precisa de oficial + não oficial | limite configurável |
| 7 | Sem limite de atraso nem expiração | mensagem presa sai fora de contexto | expirar a atividade |
| 8 | Sem lista de supressão | quem pediu para sair continua recebendo | tabela de opt-out + palavras "SAIR" |
| 9 | LGPD | base com CPF e telefone | aceite por canal, exclusão a pedido, credenciais cifradas |

---

## 10. Roteiro de construção

| Fase | Entrega | Depende de |
|---|---|---|
| **0 · Fundação** | Caddy/HTTPS, Postgres, Redis/filas, login com funções, backup externo | subdomínio |
| **1 · Dados** | concluir testes da Yampi (já existe) + Shopify nova; deduplicação, Clientes/Leads, atributos | fase 0 |
| **2 · Segmentação** | RFM diária, grupos (primeiras 15 categorias de filtro), tags, opt-out | fase 1 |
| **3 · WhatsApp Oficial** | WABA própria, templates (6 formatos), sincronização, webhooks de status e qualidade | Business Manager verificado + chip dedicado |
| **4 · Motor de campanhas** | 7 passos, 15 tipos, condições de disparo, janela, limite de atraso, limite diário, semi-automático, atividades | fases 2 e 3 |
| **5 · Bônus + atribuição** | cupom único na loja, cashback, lembrete e recuperação, indicadores por campanha, UTMs, janela de 48h + grupo de controle | fase 4 |
| **6 · E-mail** | Unlayer, kit da marca, SES, domínio, supressões | domínio |
| **7 · Claude** | Redator, Revisor de template, Analista semanal, Diretor de arte | chave da API |
| **8 · Grupo VIP no CRM** | números unificados, cruzamento cliente ↔ grupo, filtros VIP | fase 2 |
| **9 · Captação e pesquisa** | pop-up, pesquisas, campanha Avaliação | fase 4 |
| **10 · Atendimento** | inbox, setores, macros e depois o atendente com IA | fase 3 |

As fases 1 a 4 já rodam **Status do Pedido + Carrinho + Resgate de Pix**, que é
exatamente a ordem que a própria Martz recomenda para gerar retorno primeiro.

---

## 11. Decisões que são suas

1. **Stack:** reaproveitar a linguagem do `gv-app` ou começar em Node/TypeScript
   + Next.js?
2. **Checkout:** Shopify pura, Yampi pura, ou Shopify com checkout Yampi? Isso
   define quem é o "dono" do pedido.
3. **Número oficial:** chip novo (recomendado pela própria Martz) ou migrar um
   atual? Um número migrado para a API **para de funcionar** no app e na
   Evolution, então não pode ser o número dos grupos.
4. **Provedor de e-mail** e **modelo de imagem**.
5. **Só Vitorine ou multi-loja** (vender como a Martz)? Multi-loja muda o banco
   desde o primeiro dia e exige virar Tech Provider da Meta.

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
