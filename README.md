# 🛡️ Sthens Mod — Bot de Moderação Avançada para Discord

Bot completo de moderação para Discord, feito com **Node.js + discord.js v14**, com **AutoMod inteligente**, **sistema de advertências**, **logs detalhados** e **personalização com a marca do servidor**.

> **Tudo o que está no anúncio:** comandos de moderação, proteção automática contra spam/flood/links/menções, ghost ping, palavras proibidas, advertências com auto-ban, logs completos, nome/cor/logo personalizados e suporte a hospedagem própria.

---

## 📋 Índice

- [Recursos](#-recursos)
- [Requisitos](#-requisitos)
- [Criando o bot no Discord](#-criando-o-bot-no-discord)
- [Instalação](#-instalação)
- [Configuração inicial](#-configuração-inicial)
- [Comandos](#-comandos)
- [AutoMod](#-automod)
- [Sistema de advertências](#-sistema-de-advertências)
- [Logs](#-logs)
- [Personalização](#-personalização)
- [Hospedagem](#-hospedagem)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Solução de problemas](#-solução-de-problemas)
- [Licença](#-licença)

---

## ✨ Recursos

- ✅ **AutoMod inteligente** — spam/flood, convites, links, menções em massa, ghost ping e palavras proibidas.
- ✅ **Punições configuráveis** — apagar mensagem, silenciar, expulsar ou banir automaticamente.
- ✅ **Sistema de advertências** — histórico por usuário, DM automática, remoção por ID e auto-ban configurável.
- ✅ **Moderação completa** — `/ban`, `/unban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/delwarn`, `/purge`, `/lockdown`, `/slowmode` e `/nuke`.
- ✅ **Logs detalhados** — entradas/saídas, mensagens editadas/apagadas, bans/desbans, timeouts, ações de moderadores e AutoMod.
- ✅ **Personalização total** — nome, cor e logo da sua marca em todos os embeds.
- ✅ **Slash commands** — comandos modernos com validação e respostas privadas.
- ✅ **Banco SQLite** — configurações e advertências persistentes, sem precisar de banco externo.
- ✅ **Anti-duplicação de logs** — ações do bot não geram logs repetidos.
- ✅ **Pronto para Docker e PM2**.

---

## ✅ Requisitos

- **Node.js 22 ou superior** (recomendado: Node 24).
- Uma aplicação/bot no [Discord Developer Portal](https://discord.com/developers/applications).
- Permissões de administrador em um servidor de testes.
- Opcional: Docker e Docker Compose para hospedagem.

---

## 🤖 Criando o bot no Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications).
2. Clique em **New Application**, dê um nome e confirme.
3. No menu lateral, abra **Bot** e clique em **Reset Token**.
4. Copie o token e guarde-o — ele aparece **uma única vez**.
5. Ainda em **Bot**, ative as opções:
   - ✅ **Server Members Intent** (obrigatório)
   - ✅ **Message Content Intent** (obrigatório para o AutoMod)
6. Em **General Information**, copie o **Application ID**.
7. Em **OAuth2 → URL Generator**, marque:
   - Scopes: `bot` e `applications.commands`
   - Permissions: **Ver Canais**, **Enviar Mensagens**, **Gerenciar Mensagens**, **Inserir Links**, **Ler Histórico de Mensagens**, **Banir Membros**, **Expulsar Membros**, **Silenciar Membros**, **Gerenciar Canais** e **Ver Registro de Auditoria**.
8. Abra a URL gerada e adicione o bot ao seu servidor.

### Link de convite pronto

Substitua `SEU_CLIENT_ID` pelo ID da aplicação:

```text
https://discord.com/api/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=1099511721110&scope=bot%20applications.commands
```

> A permissão **Administrador** também funciona, mas não é necessária. O ideal é usar apenas as permissões acima.
>
> ⚠️ O cargo do bot precisa estar **acima** dos cargos que ele vai moderar. Caso contrário, ban/kick/timeout falharão com erro de hierarquia.

---

## 🚀 Instalação

### 1. Baixe/clone o projeto

```bash
cd discord-mod-bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Crie o arquivo `.env`

**Windows (Prompt de Comando):**

```bat
copy .env.example .env
```

**Linux/macOS:**

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=123456789012345678
GUILD_ID=123456789012345678
AUTO_DEPLOY=true
DB_PATH=./data/bot.db
```

| Variável | Descrição |
|---|---|
| `DISCORD_TOKEN` | Token do bot (obrigatório). |
| `CLIENT_ID` | Application ID do bot (obrigatório). |
| `GUILD_ID` | ID do servidor. Recomendado para registrar os comandos na hora. |
| `AUTO_DEPLOY` | `true` registra os comandos no servidor ao iniciar (requer `GUILD_ID`). Use `false` se preferir rodar `npm run deploy`. |
| `DB_PATH` | Caminho do banco SQLite. O padrão é `./data/bot.db`. |

### 4. Registre os comandos

```bash
npm run deploy
```

> Se `GUILD_ID` estiver preenchido, os comandos aparecem imediatamente no servidor. Sem ele, o registro é global e pode levar até 1 hora.
>
> Se `AUTO_DEPLOY=true` e `GUILD_ID` estiver preenchido, o bot também registra automaticamente ao iniciar. Nesse caso, o comando acima é opcional. Para comandos globais (sem `GUILD_ID`), use sempre `npm run deploy`.

### 5. Inicie o bot

```bash
npm start
```

Para desenvolvimento com reinício automático:

```bash
npm run dev
```

No Windows, também é possível dar duplo clique em **`start.bat`**.

---

## ⚙️ Configuração inicial

Depois que o bot estiver online, use estes comandos no servidor:

### 1. Defina o canal de logs

```text
/config logs canal:#logs
```

O bot envia uma mensagem de teste para confirmar que tem acesso ao canal.

### 2. Personalize a marca

```text
/config marca nome:Minha Comunidade cor:#5865F2 logo:https://i.imgur.com/exemplo.png
```

- **nome**: aparece no rodapé de todos os embeds.
- **cor**: cor principal dos embeds (hexadecimal).
- **logo**: URL pública de uma imagem (PNG/JPG/GIF/WebP).

Todos os campos são opcionais, mas informe pelo menos um. Use `/config ver` para conferir a configuração atual.

### 3. Revise o AutoMod

```text
/automod status
```

### 4. Configure o auto-ban por advertências (opcional)

```text
/automod limites avisos:5 autoban:true
```

Agora, ao receber a 5ª advertência, o usuário é banido automaticamente (se o bot puder agir sobre ele).

---

## 🛡️ Comandos

### Moderação

| Comando | Descrição | Permissão necessária |
|---|---|---|
| `/ban` | Bane um usuário, com opção de apagar mensagens de 1 ou 7 dias. | Banir Membros |
| `/unban` | Remove o banimento pelo ID do usuário. | Banir Membros |
| `/kick` | Expulsa um usuário do servidor. | Expulsar Membros |
| `/timeout` | Silencia por tempo (`10m`, `1h`, `1d`...) ou remove com `0`. | Silenciar Membros |
| `/warn` | Aplica uma advertência e envia DM ao usuário. | Silenciar Membros |
| `/warnings` | Mostra o histórico de advertências. | Silenciar Membros |
| `/delwarn` | Remove uma advertência pelo ID. | Silenciar Membros |
| `/purge` | Apaga de 1 a 100 mensagens, com filtro por usuário. | Gerenciar Mensagens |
| `/lockdown` | Tranca/destranca um canal para o `@everyone`. | Gerenciar Canais |
| `/slowmode` | Ativa/desativa o modo lento de um canal. | Gerenciar Canais |
| `/nuke` | Recria um canal do zero, com confirmação por botão. | Gerenciar Canais |

**Detalhes importantes:**

- Todos os comandos de moderação verificam **hierarquia de cargos** antes de agir.
- Ban, kick e timeout tentam avisar o usuário por **DM** antes da punição.
- Cada ação gera um **caso numerado** e um log no canal configurado.
- O `/nuke` pede confirmação e **não pode ser desfeito**.
- O `/purge` respeita o limite de 14 dias do Discord para exclusão em massa.

### Configuração

| Comando | Descrição | Permissão necessária |
|---|---|---|
| `/config marca` | Define nome, cor e logo da marca. | Gerenciar Servidor |
| `/config logs` | Define o canal de logs. | Gerenciar Servidor |
| `/config ver` | Mostra a configuração atual. | Gerenciar Servidor |
| `/automod status` | Mostra o status do AutoMod. | Gerenciar Servidor |
| `/automod alternar` | Liga/desliga um módulo. | Gerenciar Servidor |
| `/automod punicao` | Define a punição automática. | Gerenciar Servidor |
| `/automod limites` | Ajusta spam, menções e auto-ban. | Gerenciar Servidor |
| `/automod palavras` | Gerencia palavras proibidas. | Gerenciar Servidor |
| `/automod links` | Gerencia a whitelist de domínios. | Gerenciar Servidor |

### Geral

| Comando | Descrição |
|---|---|
| `/help` | Lista todos os comandos e o guia de primeiros passos. |
| `/ping` | Mostra latência WebSocket, tempo de resposta e uptime. |

---

## 🤖 AutoMod

O AutoMod fica ativo **24 horas por dia** e age automaticamente contra:

| Módulo | O que detecta | Padrão |
|---|---|---|
| **Spam / Flood** | Muitas mensagens em poucos segundos. | ✅ Ativo |
| **Convites do Discord** | Links `discord.gg`, `discord.com/invite`, `discord.me`, etc. | ✅ Ativo |
| **Links externos** | Qualquer URL fora da whitelist. | ❌ Inativo |
| **Menções em massa** | Muitas menções de usuários/cargos em uma mensagem. | ✅ Ativo |
| **Palavras proibidas** | Termos cadastrados pelo servidor. | ✅ Ativo |
| **Ghost Ping** | Mensagem com menção apagada rapidamente pelo autor. | ✅ Ativo |

### Punições disponíveis

```text
/automod punicao tipo:Apenas apagar a mensagem
/automod punicao tipo:Silenciar (timeout) duracao:10m
/automod punicao tipo:Expulsar do servidor
/automod punicao tipo:Banir do servidor
```

- **Apagar mensagem** — remove a mensagem e registra no log.
- **Silenciar** — aplica timeout (mínimo 10s, máximo 28 dias).
- **Expulsar** — remove o usuário do servidor.
- **Banir** — bane o usuário permanentemente.

> Se o bot não tiver permissão ou hierarquia suficiente, ele apaga a mensagem e registra “sem permissão para punir” no log. Nada é executado fora das regras.

### Limites

```text
/automod limites spam_mensagens:5 spam_segundos:5 mencoes:5
```

- **spam_mensagens**: quantidade de mensagens que dispara a punição (2 a 30).
- **spam_segundos**: janela de tempo da detecção (2 a 120).
- **mencoes**: mínimo de menções para punir (2 a 30).
- **avisos**: advertências para auto-ban (1 a 20).
- **autoban**: liga/desliga o banimento automático por advertências.

### Palavras proibidas

```text
/automod palavras acao:Adicionar palavra:palavrão
/automod palavras acao:Remover palavra:palavrão
/automod palavras acao:Listar
```

- Funciona com palavras e frases.
- A detecção ignora maiúsculas/minúsculas e respeita limites de palavra.
- Limite de 100 termos.

### Whitelist de links

```text
/automod links acao:Adicionar dominio:youtube.com
/automod links acao:Remover dominio:youtube.com
/automod links acao:Listar
```

- Subdomínios também são liberados (`www.youtube.com`, `m.youtube.com`).
- O filtro de links só age se estiver ativo:

```text
/automod alternar modulo:Links externos ativo:true
```

- Com a whitelist vazia e o filtro ativo, **todos** os links são bloqueados.
- Convites do Discord continuam sendo tratados pelo módulo de convites, independentemente da whitelist.

### Ghost Ping

Quando alguém menciona um usuário/cargo e apaga a mensagem em até **60 segundos**, o bot registra no canal de logs:

- autor da mensagem;
- canal;
- usuários/cargos mencionados;
- conteúdo apagado.

Ghost Ping é um recurso de **detecção e log**, sem punição automática.

> Moderadores com **Gerenciar Mensagens** ou **Administrador** são isentos do AutoMod.

---

## ⚠️ Sistema de advertências

- Cada `/warn` registra uma advertência com **ID único**, moderador, motivo e data.
- O usuário recebe uma **DM automática** com o motivo e o total de advertências.
- O histórico completo fica disponível em `/warnings`.
- Remova uma advertência específica com `/delwarn`.
- Configure o auto-ban com:

```text
/automod limites avisos:5 autoban:true
```

Quando o limite é atingido, o bot:

1. registra a advertência;
2. envia a DM de aviso;
3. bane o usuário automaticamente (se tiver hierarquia/permissão);
4. registra o caso e o log.

> As advertências ficam salvas no SQLite (`data/bot.db`). Faça backup desse arquivo regularmente.

---

## 📊 Logs

Configure o canal com `/config logs canal:#logs`.

O bot registra:

| Evento | Informações |
|---|---|
| 📥 Membro entrou | Usuário, data de criação da conta, total de membros. |
| 📤 Membro saiu | Usuário e total de membros. |
| 👢 Membro expulso | Usuário, moderador e motivo (via registro de auditoria). |
| 🗑️ Mensagem apagada | Autor, canal e conteúdo. |
| 🧹 Mensagens apagadas em massa | Canal, quantidade e autores. |
| ✏️ Mensagem editada | Autor, canal, conteúdo antes/depois e link. |
| 🔨 Usuário banido | Usuário, moderador e motivo. |
| 🔓 Usuário desbanido | Usuário, moderador e motivo. |
| 🔇 Timeout aplicado | Usuário, data de término e motivo. |
| 🔊 Timeout removido | Usuário e data anterior. |
| 🤖 AutoMod | Usuário, canal, punição, detalhes e mensagem. |
| 👻 Ghost Ping | Autor, canal, menções e conteúdo apagado. |
| 🛡️ Ação de moderação | Ação, moderador, alvo, motivo e número do caso. |
| 🧹 Purge | Moderador, canal, quantidade, filtro e motivo. |
| 💥 Nuke | Moderador, canal recriado e motivo. |

> Se o canal de logs for recriado com `/nuke`, o bot atualiza a configuração automaticamente.

---

## 🎨 Personalização

```text
/config marca nome:Minha Comunidade cor:#FF6B00 logo:https://exemplo.com/logo.png
```

A marca é aplicada em:

- rodapé de todos os embeds;
- ícone do rodapé;
- thumbnail dos embeds;
- cor principal;
- DMs de punição e advertência.

Cada servidor tem sua própria configuração — o mesmo bot pode atender vários servidores com marcas diferentes.

---

## ☁️ Hospedagem

### Opção 1 — VPS com PM2 (recomendado)

```bash
npm install -g pm2
npm install
npm run deploy
pm2 start src/index.js --name sthens-mod
pm2 save
pm2 startup
```

Comandos úteis:

```bash
pm2 logs sthens-mod
pm2 restart sthens-mod
pm2 stop sthens-mod
```

### Opção 2 — Docker

```bash
cp .env.example .env
# edite o .env
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f
```

Se você não preencheu `GUILD_ID`, registre os comandos manualmente:

```bash
docker compose exec bot npm run deploy
```

O banco fica persistido na pasta `./data` do host.

### Opção 3 — Windows

Dê duplo clique em `start.bat` ou execute:

```bat
npm install
npm start
```

Para manter o bot online após fechar o terminal, use o **PM2** ou o **Agendador de Tarefas do Windows**.

### Variáveis de ambiente na hospedagem

Configure `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` e `DB_PATH` no painel da hospedagem. **Nunca** envie o arquivo `.env` para o cliente ou para o GitHub.

---

## 📁 Estrutura do projeto

```text
discord-mod-bot/
├── src/
│   ├── index.js                 # Inicialização do bot
│   ├── config.js                # Variáveis de ambiente
│   ├── deploy-commands.js       # Registro dos slash commands
│   ├── commands/
│   │   ├── moderation/          # Ban, kick, warn, purge, nuke...
│   │   ├── config/              # /config e /automod
│   │   └── general/             # /help e /ping
│   ├── events/                  # Eventos do Discord e logs
│   ├── handlers/                # Carregadores e AutoMod
│   ├── database/                # SQLite (configurações, warns, casos)
│   └── utils/                   # Embeds, permissões, tempo, logs...
├── data/                        # Banco de dados (criado automaticamente)
├── .env.example
├── .npmrc                       # Evita recompilação nativa desnecessária
├── Dockerfile
├── docker-compose.yml
├── start.bat
├── start.sh
├── package.json
└── README.md
```

---

## 🧰 Solução de problemas

### O bot não liga / “Used disallowed intents”

Ative **Server Members Intent** e **Message Content Intent** no Developer Portal, em **Bot → Privileged Gateway Intents**.

### Os comandos não aparecem no Discord

1. Confirme que o bot foi convidado com o scope `applications.commands`.
2. Rode `npm run deploy`.
3. Confira o `GUILD_ID` no `.env`.
4. Reinicie o cliente do Discord (`Ctrl + R`).
5. Comandos globais podem levar até 1 hora para aparecer.

### “Missing Permissions” ao banir/expulsar

- O cargo do bot precisa estar **acima** do cargo do alvo.
- O bot precisa das permissões de **Banir Membros**, **Expulsar Membros**, **Silenciar Membros**, etc.
- O dono do servidor não pode ser banido/expulso.

### O bot não envia logs

- Confira `/config ver`.
- Verifique se o bot tem **Ver Canal**, **Enviar Mensagens** e **Inserir Links** no canal de logs.
- O canal não pode ser uma thread.

### O AutoMod não apaga mensagens

- Ative o **Message Content Intent**.
- Verifique se o módulo está ativo com `/automod status`.
- O autor precisa ser um membro comum (moderadores com **Gerenciar Mensagens** são isentos).
- O bot precisa de **Gerenciar Mensagens** no canal.

### Erro ao instalar `better-sqlite3`

O projeto inclui um arquivo **`.npmrc`** com `ignore-scripts=true`. Ele é necessário porque o `better-sqlite3` já vem com binários prontos e o npm, em algumas versões, tenta recompilar a biblioteca sem necessidade.

- **Não apague o `.npmrc`.**
- Use **Node.js 22 ou superior**.
- Se você apagou o `.npmrc`, restaure-o com o conteúdo:

```ini
ignore-scripts=true
```

- Se ainda assim houver erro, confirme que está usando a versão correta do Node (`node --version`) e apague `node_modules` + `package-lock.json` antes de rodar `npm install` novamente.
- Caso adicione novas dependências que realmente precisem de scripts de instalação, remova temporariamente o `.npmrc` e instale as **Build Tools** do Visual Studio (Windows) ou `python3`, `make` e `g++` (Linux).

### DM de punição não chega

O usuário pode ter DMs fechadas ou bloquear o bot. A punição continua funcionando normalmente; a DM é apenas um aviso.

### Backup

Copie o arquivo `data/bot.db` (e, se existirem, `bot.db-wal` e `bot.db-shm`) com o bot parado. Para restaurar, coloque os arquivos de volta na pasta `data/` e inicie o bot.

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE).

Copyright © 2026 **Sthens**. Todos os direitos reservados conforme a licença.

---

## 💎 Entrega do produto

Este repositório contém **a source completa** do bot, pronta para:

- ser hospedada pelo cliente;
- ser configurada e entregue como serviço;
- ser personalizada com nome, cor e logo de cada comunidade;
- ser mantida com hospedagem mensal e suporte.

**Não é necessário saber programar** para colocar o bot no ar seguindo o passo a passo acima. Para o serviço de configuração completo, basta executar os passos de instalação e configuração inicial no servidor do cliente.
