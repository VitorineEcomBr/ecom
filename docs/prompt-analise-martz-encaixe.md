# Prompt — Análise completa da Martz e encaixe no CRM Vitorine

> **Como usar:** cole tudo o que está abaixo da linha em uma sessão do **Claude Code
> aberta na pasta do projeto no seu Mac**, com o Chrome conectado (`claude --chrome`)
> e logado em `painel.martz.com.br`. Anexe junto o arquivo
> `docs/auditoria-martz-e-especificacao-crm.md`.
>
> Sem Chrome conectado, a Fase 1 pode ser feita com prints das telas: o agente
> analisa as imagens no lugar de navegar.

---

## PAPEL

Você é um arquiteto de software sênior especializado em CRM de retenção para
e-commerce, WhatsApp (API Oficial da Meta e Evolution API) e integrações com
Shopify e Yampi. Sua tarefa é **analisar por dentro tudo o que a Martz CRM tem**
e **encaixar no sistema que já estamos construindo**, sem quebrar o que já funciona.

## CONTEXTO DO PROJETO

- **Loja:** Vitorine (calçados e acessórios masculinos em couro).
- **Infraestrutura:** VPS Contabo, Docker Compose, pasta `/opt/grupo-vip`.
  Contêineres: `gv-evolution` (Evolution API 2.4.0-rc2), `gv-app` (nosso sistema),
  `gv-postgres` e `gv-redis` (internos da Evolution). O app usa **SQLite**
  (`dados/app.db`). O painel é acessado por túnel SSH. O manual está em `OPERACAO.md`.
- **Integrações de e-commerce:** apenas **Yampi** e **Shopify** por enquanto.
- **WhatsApp:** hoje só o **não oficial** (Evolution). Vamos ter **os dois**:
  Oficial (Meta Cloud API) e Não Oficial (Evolution).
- **IA:** o **Claude** faz o papel do "Martin" da Martz, em análise, redação,
  atendimento e prompts de imagem. As imagens são geradas por um modelo de
  imagem à parte.
- **Referência obrigatória:** `docs/auditoria-martz-e-especificacao-crm.md`
  (auditoria v2, feita a partir dos 118 artigos da central de ajuda da Martz).
  **Leia inteira antes de começar.**

## O QUE JÁ ESTÁ PRONTO E NÃO PODE QUEBRAR

### 1. Gestão de Grupos VIP — em produção, MANTER COMO ESTÁ

Tudo abaixo é intocável. O CRM se conecta a ele, nunca o reescreve.
- Até 2 números por Evolution; cada grupo dispara pelo número escolhido.
- Disparo em até 4 partes: texto, imagem, vídeo, GIF, áudio ptt, vídeo bolinha,
  carrossel (até 10 cards).
- Regras de formato: a parte 1 nunca é carrossel nem áudio, porque é ela que
  notifica pela menção. Botão só em texto e imagem.
- Ritmo: espaçamento **por número**, piso de 15s entre grupos, faixa sorteada,
  janela de horário, teto diário, tentativas. Tudo ajustável pelo painel.
- Telas de Agendamento e Histórico.
- Backup diário às 04:00 pela API online do SQLite.
- Segurança do servidor: SSH só por chave, UFW, fail2ban.

### 2. Integração com a Yampi — funcionando, EM TESTES

- **Não reescrever.** Primeiro inventariar o que ela já faz. Depois propor só
  complementos, como ajustes aditivos.
- Todo ajuste proposto precisa dizer **o impacto nos testes em andamento**.

## REGRAS DE SEGURANÇA DESTA TAREFA

1. **Esta tarefa é só de análise e planejamento.** Não altere código, banco,
   `.env`, `docker-compose.yml` nem nada no servidor. Não faça commit.
2. **Na Martz, somente leitura:**
   - Não clique em Salvar, Criar, Enviar, Disparar, Ativar, Publicar, Excluir,
     Duplicar, Clonar, Conectar, Desconectar, Sincronizar, Importar nem Pagar.
   - Pode abrir abas, formulários, assistentes e modais para ver o que existe,
     e depois feche ou cancele.
   - Na dúvida se uma ação muda algo, **não faça**: anote "não testado".
   - Não copie dados pessoais de clientes (nome, telefone, e-mail, CPF). Só
     números agregados.
3. **No servidor, só comandos de leitura** (`ls`, `cat`, `grep`, `docker compose ps`,
   `docker compose logs`, `sqlite3 ... ".schema"` e `SELECT count(*)`). Nunca:
   - `docker compose down -v`;
   - `cp` do `app.db`;
   - reiniciar contêineres;
   - ler ou imprimir o valor de segredos do `.env`. Liste só os nomes das variáveis.
4. Se precisar de algo fora dessas regras, **pare e pergunte**.

---

## FASE 0 — Preparação

1. Leia `docs/auditoria-martz-e-especificacao-crm.md` e o `OPERACAO.md`.
2. Liste os itens da auditoria marcados **[conferir no painel]**. Eles são
   prioridade na Fase 1.

## FASE 1 — Varredura da Martz por dentro (painel logado, somente leitura)

Percorra **todos** os itens do menu lateral, os submenus, o menu do usuário
(Configurações) e o Painel do Vendedor, se houver acesso. Em cada tela, abra
todas as abas, filtros, botões de "novo", assistentes e modais. Só olhe e
depois feche.

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
```

**Detalhe máximo obrigatório em:**

1. **Itens [conferir no painel] da auditoria:**
   - **geração de imagem com IA** no editor de e-mail: onde fica, o que pede,
     estilos, tamanhos, limites e custo;
   - a opção **"IA Personalizada"** nas ações de campanha: o que pede e o que entrega;
   - qualquer **análise com IA** nos indicadores ou dashboards;
   - a **lista completa de predefinições de texto** de cada tipo de campanha
     (copie os textos);
   - a tela do **número não oficial**: limite diário, intervalo entre mensagens,
     status, reconexão;
   - qualquer menção às fases de estratégia 2, 4, 5, 6, 7 e 8.
2. **Criar campanha:** abra o assistente de **cada um dos 15 tipos** (e a Campanha
   de Vendedores) e documente os 7 passos. Inclua todos os parâmetros de gatilho,
   todas as condições de disparo, todos os campos do Bônus e todas as opções
   avançadas da ação.
3. **Grupos de clientes:** confirme as 29 categorias e os 119 filtros e anote
   os que não estiverem na auditoria.
4. **Indicadores:** cada visão, cada métrica, cada filtro de período e o
   resultado de uma campanha (aba de resultados e aba de atividades).
5. **WhatsApp:**
   - Telefones Oficiais: dados mostrados, qualidade, limite, métodos de pagamento;
   - Modelos de Mensagem: formatos, campos, validações, sincronização;
   - número não oficial.
6. **Modelos de e-mail:** blocos do editor, categorias de modelos prontos, Kit da
   marca, bloco de produtos dinâmico.
7. **Atendimento e Martin:** todas as telas de configuração dos agentes, com
   campos, valores padrão e textos de ajuda.
8. **Integrações:** a tela da Yampi e a da Shopify, mostrando o que pedem e quais
   status aparecem.
9. **Configurações:** todas as seções, inclusive usuários, funções e permissões.

**No fim da fase entregue:**
- a árvore completa do menu;
- as telas que não conseguiu abrir e o motivo;
- as ações que deixou de testar por segurança.

## FASE 2 — Inventário do nosso sistema (somente leitura)

1. **Estrutura:** linguagem, framework, pastas, rotas/endpoints, telas do painel,
   jobs e agendadores, filas, tabelas do SQLite (`.schema` e contagem de linhas
   por tabela).
2. **Grupo VIP:** mapeie os módulos, tabelas e fluxos de disparo e a lógica de
   ritmo por número. Marque cada peça como **"congelada"**: não mexer.
3. **Integração Yampi (em testes):**
   - quais eventos/webhooks recebe e como valida a assinatura;
   - se faz backfill do histórico e como (em fatias diárias?);
   - que dados guarda: clientes, pedidos, itens, produtos, carrinhos, status,
     forma de pagamento, rastreio, cupom;
   - como evita duplicidade (idempotência, chave do cliente: CPF, telefone ou
     e-mail);
   - se tem reconciliação periódica;
   - o que falha ou está incompleto nos testes (logs das últimas 24–72h, só leitura).
4. **Evolution:** instâncias, eventos consumidos e como o app fala com ela.
5. **Pontos de extensão:** onde um módulo novo pode entrar **ao lado** do que
   existe, sem editar o Grupo VIP.

## FASE 3 — Matriz de encaixe (Martz × nosso sistema)

Para **cada funcionalidade da Martz** (auditoria + Fase 1), preencha:

| Funcionalidade Martz | Existe no nosso? (sim / parcial / não) | Onde vai encaixar (módulo, tabela, tela) | Reaproveita o quê (Yampi, Evolution, VIP) | Dependências | Risco para o Grupo VIP | Risco para a integração Yampi | Esforço (P/M/G) | Prioridade (P0–P3) | Como fazer melhor que a Martz |
|---|---|---|---|---|---|---|---|---|---|

**Cobertura mínima:**
- Clientes/Leads, deduplicação, atributos customizados;
- Grupos de clientes e filtros E/OU/NÃO;
- RFM (quintis, 11 segmentos, recálculo diário);
- motor de campanhas: 15 tipos, 7 passos, condições de disparo, janela, limite
  de atraso, limite diário, modo semi-automático;
- atividades e os 11 status;
- WhatsApp Oficial (templates em 6 formatos, mapeamento de variáveis,
  sincronização, erros da Meta, limite de 2 mensagens de marketing por pessoa
  em 24h) e Não Oficial 1:1;
- bônus (valor fixo, percentual, cashback, frete grátis, multiplicador,
  lembrete, recuperação, cupom único criado na loja);
- indicadores (5 visões), resultado por campanha, atribuição direta e em 48h, UTMs;
- e-mail (editor, kit da marca, domínio, supressões);
- pop-up, pesquisas e a campanha Avaliação;
- atendimento (inbox, setores, macros);
- IA (Martin → agentes com Claude);
- vendedores e carteiras;
- Tag Manager e Analytics do site;
- SMS;
- **Integração Shopify (nova).**

**Diferenciais que obrigatoriamente entram no plano:**
1. **Grupos VIP ligados ao CRM:** cruzar participantes com clientes, filtro
   "está / não está no VIP", campanha para convidar Campeões para o VIP, receita
   do grupo com cupom exclusivo. Sempre lendo o VIP, nunca alterando o motor dele.
2. **Reavaliar se o cliente ainda deve receber a mensagem na hora do envio**,
   não só na entrada.
3. **Espera em minutos e horas** dentro da régua (a Martz só tem dias).
4. **Grupo de controle** para medir a receita que a campanha realmente adiciona.
5. **Contagem de mensagens de marketing por cliente**, respeitando o limite da
   Meta **antes** de enviar.
6. **Pausa automática** quando a qualidade do número oficial cai.
7. **Analista com Claude:** relatório semanal e perguntas em linguagem natural.
8. **Ritmo por número** (já validado no VIP) aplicado também ao envio
   não oficial 1:1.

## FASE 4 — Arquitetura de encaixe (incremental, sem reescrever)

1. **Estratégia:** módulos novos ao lado do atual. Não fazer uma reescrita única.
2. **Banco:** avalie e recomende se o CRM deve ir para **Postgres** (separado do
   Postgres da Evolution), mantendo o SQLite do Grupo VIP por ora. Mostre como os
   dois conversam e o plano de migração futura, se fizer sentido. Justifique
   com números.
3. **Modelo de dados:** tabelas novas e colunas novas nas tabelas da Yampi
   (**só adicionar**, com impacto nos testes).
4. **Filas e workers:** motor de campanhas, envio por canal e por número,
   RFM, sincronização, IA.
5. **Infraestrutura:** Caddy/HTTPS (obrigatório para webhooks de Shopify, Yampi
   e Meta), login por usuário com funções, backup fora da VPS, tamanho de VPS
   recomendado.
6. **WhatsApp Oficial:** WABA própria com token de usuário de sistema (uma loja
   só, sem virar Tech Provider), número dedicado que **não seja** o dos grupos,
   webhooks de status e qualidade.
7. **Camada de canais:** uma interface única de envio (Oficial, Evolution,
   e-mail, SMS). A Evolution do Grupo VIP é chamada pela mesma camada, sem mudar
   o comportamento atual.

## FASE 5 — Roteiro de construção

Divida em fases de 1 a 2 semanas. Em cada fase informe:
- entregas;
- **critério de aceite testável**;
- arquivos e módulos afetados;
- o que **não** será tocado;
- como testar sem disparar para clientes reais (número de teste, grupo de teste,
  modo semi-automático);
- plano de volta atrás.

**Ordem-base (ajuste com o que o inventário mostrar):**
0. Fundação: HTTPS, banco do CRM, filas, login, backup externo.
1. Consolidar a Yampi (terminar os testes) e depois a Shopify.
2. Clientes, deduplicação, RFM e grupos.
3. WhatsApp Oficial e templates.
4. Motor de campanhas começando por **Status do Pedido, Carrinho e Resgate de Pix**.
5. Bônus e atribuição.
6. E-mail.
7. Claude (Redator, Revisor de template, Analista, Diretor de arte).
8. Ligação Grupo VIP ↔ CRM.
9. Pop-up e pesquisas.
10. Atendimento e atendente com IA.

## ENTREGÁVEIS

Salve tudo em `docs/analise-martz/`:

1. `01-varredura-martz.md` — Fase 1 completa, tela a tela.
2. `02-inventario-sistema-atual.md` — Fase 2, com o Grupo VIP e a Yampi detalhados.
3. `03-matriz-de-encaixe.md` — Fase 3.
4. `04-arquitetura-de-encaixe.md` — Fase 4, com diagrama e modelo de dados.
5. `05-roteiro.md` — Fase 5.
6. `00-resumo-executivo.md` — no máximo 1 página:
   - o que a Martz tem que ainda não temos;
   - onde já estamos à frente;
   - as 5 decisões que preciso tomar;
   - o primeiro passo recomendado.

Ao terminar, me mostre o resumo executivo e pergunte se pode seguir para a
implementação da Fase 0. **Não implemente nada antes da minha aprovação.**
