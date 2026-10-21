# CasaFinance

Controle financeiro local e responsivo para duas pessoas acompanharem o dinheiro destinado à compra/montagem da casa. Funciona 100% na rede local (Wi-Fi), sem depender de internet ou de qualquer serviço em nuvem.

- **Frontend:** React + Vite (mobile-first)
- **Backend:** Node.js + Express
- **Banco:** SQLite (módulo nativo `node:sqlite` do Node.js — sem dependências de compilação)
- **Autenticação:** login local com duas contas, senha com hash (bcrypt) e sessão `HttpOnly`

O saldo nunca é um número editável: ele é sempre **derivado do histórico de movimentações** (`saldo = soma das entradas − soma das saídas`). O dinheiro disponível inicial é cadastrado como uma entrada na categoria "Saldo inicial / Aporte".

---

## 1. Requisitos

- **Node.js 22.5 ou superior** (recomendado 24.x — é a versão usada no desenvolvimento). O projeto usa o módulo nativo `node:sqlite`, por isso **não há necessidade de instalar Visual Studio Build Tools, Python ou qualquer toolchain de compilação no Windows**.
- **Docker Desktop** (opcional, apenas se preferir rodar via container).

> Nota: ao rodar, você verá no console um aviso `ExperimentalWarning: SQLite is an experimental feature...`. É esperado — é apenas um aviso do Node sobre o módulo `node:sqlite`, não um erro, e não afeta o funcionamento.

---

## 2. Instalação no Windows (execução nativa, sem Docker)

Abra o PowerShell ou o Prompt de Comando na pasta `casa-finance/`.

```powershell
# 1. Instalar todas as dependências (client + server)
npm install

# 2. Copiar o arquivo de variáveis de ambiente
copy .env.example .env
```

Edite o `.env` gerado e troque `SESSION_SECRET` por uma string aleatória longa. Você pode gerar uma com:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```powershell
# 3. Construir o frontend de produção
npm run build

# 4. Criar os dois usuários iniciais (sem senha padrão no código).
#    O comando pede nome/usuário/senha interativamente no terminal.
npm run create:users

# 5. Iniciar o servidor de produção (serve API + frontend na mesma porta)
npm start
```

Acesse no navegador do próprio PC: **http://localhost:3000**

> O banco SQLite e as categorias padrão são criados/garantidos automaticamente a cada inicialização do servidor (`data/casa-finance.db`). Não é necessário rodar migração manual no fluxo normal — mas o comando `npm run migrate` continua disponível caso queira aplicar o schema isoladamente.

### Criando os usuários sem interação (útil para scripts/CI)

Em vez de responder às perguntas no terminal, defina as variáveis de ambiente antes de rodar o script (no PowerShell):

```powershell
$env:USER1_NAME="Rafael"; $env:USER1_USERNAME="rafael"; $env:USER1_PASSWORD="uma-senha-forte"
$env:USER2_NAME="Pessoa 2"; $env:USER2_USERNAME="pessoa2"; $env:USER2_PASSWORD="outra-senha-forte"
npm run create:users
```

Se um usuário com o mesmo login já existir, o script apenas ignora a criação (não sobrescreve senha).

### Rodando em modo desenvolvimento (com hot reload)

Em dois terminais separados:

```powershell
npm run dev:server   # API em http://localhost:3000
npm run dev:client   # Vite dev server em http://localhost:5173 (proxy para /api)
```

---

## 3. Execução via Docker (opcional, recomendada para "deixar rodando")

```powershell
# 1. Copiar variáveis de ambiente
copy .env.example .env
# edite o .env e defina um SESSION_SECRET forte

# 2. Criar as pastas persistentes (se ainda não existirem)
mkdir data
mkdir backups

# 3. Subir o container
docker compose up -d --build

# 4. Criar os dois usuários iniciais dentro do container
docker compose exec casa-finance node scripts/create-users.js
```

Acesse no PC: **http://localhost:3000**

> O `docker-compose.yml` mapeia `./data` e `./backups` como volumes, então os dados sobrevivem a `docker compose down`/`up` e a rebuilds da imagem.

---

## 4. Acessando pelo celular (rede local)

1. Confirme que o celular está conectado ao **mesmo Wi-Fi** do computador.
2. Descubra o IP local do PC:
   - **Windows:** abra o PowerShell e rode `ipconfig`. Procure por "Endereço IPv4" do adaptador Wi-Fi ou Ethernet (ex.: `192.168.0.25`).
3. No navegador do celular, acesse `http://192.168.0.25:3000` (troque pelo IP encontrado).
4. Se não abrir:
   - Confirme que o servidor está escutando em `0.0.0.0` (já é o padrão deste projeto — veja `HOST` no `.env`).
   - Verifique o Firewall do Windows: ao rodar pela primeira vez, o Windows pode perguntar se deseja liberar o Node.js para "redes privadas" — **aceite apenas para rede privada**, nunca libere para redes públicas.
   - Não configure redirecionamento de porta no roteador. O uso é somente dentro da LAN.

O IP pode mudar após reiniciar o roteador. Para uso recorrente, você pode reservar IP fixo (DHCP reservation) nas configurações do roteador — isso é opcional.

---

## 5. Deploy gratuito na internet (Cloudflare Tunnel, pelo seu PC)

Por padrão este app foi desenhado para rodar só na rede local (ver seções 1-4). Esta seção documenta como colocá-lo acessível pela internet **sem custo e sem cartão de crédito**, usando o próprio PC como servidor e um [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) "Quick Tunnel" para expor a porta 3000 com HTTPS automático — sem abrir porta no roteador.

### 5.1. Por que não uma VM na nuvem

Avaliamos hospedar em uma VM gratuita (Google Cloud/Oracle Cloud "Always Free"), mas tanto Google quanto Oracle exigem cartão de crédito com uma cobrança de verificação para ativar o faturamento, mesmo em camadas gratuitas — inviável para este caso. O Cloudflare Tunnel não exige cartão nem conta paga.

### 5.2. Como funciona

```text
Internet → Cloudflare (HTTPS automático) → cloudflared (rodando no seu PC)
                                                   │
                                          App CasaFinance (node, porta 3000)
                                                   │
                                          SQLite em ./data (no seu PC)
```

Limitação aceita: por ser um "Quick Tunnel" (sem domínio próprio), a URL pública (`https://palavras-aleatorias.trycloudflare.com`) **muda toda vez que o túnel reinicia** (ex.: ao reiniciar o PC). Para sempre saber a URL atual, os scripts abaixo mantêm atualizado um [Gist privado](https://gist.github.com/RafaelAntunesRodrigues/712165cad8b383b06cf9bbc8936df14c) com o endereço vigente — basta abrir esse link (um favorito fixo) para pegar a URL do momento.

### 5.3. Configuração (uma única vez)

Pré-requisitos já instalados neste ambiente: `node`, `cloudflared` (`winget install Cloudflare.cloudflared`) e `gh` (GitHub CLI, autenticado).

```powershell
# 1. Instale as dependências e gere o build de produção (se ainda não fez)
npm install
npm run build

# 2. Configure o .env (copie de .env.example se ainda não existir) e gere
#    um SESSION_SECRET forte

# 3. Crie os dois usuários iniciais (interativo, sem senha padrão no código)
npm run create:users

# 4. Registre a inicialização automática (pasta "Inicializar" do Windows,
#    não precisa ser administrador)
powershell -ExecutionPolicy Bypass -File deploy\windows\install-autostart.ps1

# 5. Inicie agora, sem precisar logar de novo:
wscript.exe "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\CasaFinance-App.vbs"
wscript.exe "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\CasaFinance-Tunnel.vbs"
```

Depois disso:
- O app e o túnel iniciam sozinhos (sem janela visível) sempre que você entrar no Windows.
- Se qualquer um dos dois cair, reinicia sozinho em poucos segundos (loop de supervisão nos scripts).
- A URL pública atual fica sempre em `deploy/windows/current-tunnel-url.txt` **e** no [Gist de status](https://gist.github.com/RafaelAntunesRodrigues/712165cad8b383b06cf9bbc8936df14c).
- Logs em `logs/app.log` e `logs/tunnel.log` (não versionados).

Para desfazer a inicialização automática: `powershell -ExecutionPolicy Bypass -File deploy\windows\uninstall-autostart.ps1`.

### 5.4. Atualizando o app depois de mudar o código

Pare os processos (ou reinicie o PC), rode `npm run build` de novo e dispare os dois `.vbs` novamente (ou reinicie o PC, já que a inicialização automática cuida disso).

### 5.5. Segurança ao ficar exposto à internet

Diferente do uso só em LAN, aqui a aplicação já inclui: cabeçalhos de segurança padrão (`helmet`), cookie de sessão `Secure` automático sob HTTPS (o Cloudflare Tunnel já entrega a conexão externa como HTTPS), limite de requisições por IP (login e geral). Ainda assim: use senhas fortes para os dois usuários, mantenha `SESSION_SECRET` em segredo, e lembre que o Gist com a URL atual é privado/não-listado mas acessível a quem tiver o link — não compartilhe esse link publicamente.

---

## 6. Backup e restauração

### Gerar um backup

```powershell
npm run backup
```

Isso cria um arquivo `backups/casa-finance-YYYYMMDD-HHMM.db` usando a API de backup nativa do SQLite (cópia consistente, mesmo com o app em uso — não é necessário parar o servidor). Backups antigos além do limite definido em `BACKUP_RETENTION` (padrão 30) são removidos automaticamente.

Via Docker (LAN):

```powershell
docker compose exec casa-finance node scripts/backup.js
```

### Restaurar um backup

1. Pare o aplicativo (`Ctrl+C` no terminal nativo, ou `docker compose stop`).
2. Por segurança, copie o banco atual (`data/casa-finance.db`) para outro lugar antes de sobrescrever.
3. Copie o backup escolhido (ex.: `backups/casa-finance-20261021-1200.db`) para `data/casa-finance.db`, substituindo o arquivo atual.
4. Inicie o aplicativo novamente (`npm start` ou `docker compose up -d`).
5. Confira o dashboard para validar que os dados retornaram corretamente.

---

## 7. Scripts disponíveis (raiz do projeto)

| Comando | Descrição |
|---|---|
| `npm install` | Instala as dependências do client e do server (workspaces) |
| `npm run build` | Gera o build de produção do frontend em `client/dist` |
| `npm start` | Builda o frontend e inicia o servidor de produção na porta configurada |
| `npm run dev:server` | Inicia o backend em modo desenvolvimento (hot reload) |
| `npm run dev:client` | Inicia o Vite dev server do frontend |
| `npm run migrate` | Aplica o schema SQL manualmente (normalmente automático no boot) |
| `npm run seed:categories` | Garante as categorias padrão manualmente (normalmente automático no boot) |
| `npm run create:users` | Cria os dois usuários iniciais (interativo ou via variáveis de ambiente) |
| `npm run backup` | Gera um backup consistente do banco em `backups/` |
| `npm test` | Executa a suíte de testes automatizados do backend |

---

## 8. Estrutura do repositório

```text
casa-finance/
├─ client/                 # React + Vite
│  └─ src/
│     ├─ components/       # AppLayout, modais, listas, cards
│     ├─ pages/             # Login, Dashboard, Movimentações, Categorias
│     ├─ services/          # cliente HTTP da API
│     ├─ hooks/             # AuthContext, ToastContext
│     └─ styles/            # CSS global (mobile-first)
├─ server/
│  ├─ src/
│  │  ├─ routes/            # auth, transactions, categories, dashboard, users
│  │  ├─ controllers/       # lida com request/response
│  │  ├─ services/          # regras de negócio e queries SQL
│  │  ├─ middleware/        # autenticação, rate limit, tratamento de erro
│  │  ├─ validation/        # schemas zod
│  │  └─ db/                # conexão SQLite, schema, sessão
│  ├─ scripts/               # create-users, seed-categories, backup
│  └─ tests/                 # testes automatizados (vitest + supertest)
├─ deploy/windows/           # Cloudflare Tunnel + inicialização automática (ver seção 5)
├─ data/                    # banco SQLite (persistente, fora do controle de versão)
├─ backups/                 # backups gerados (persistente, fora do controle de versão)
├─ Dockerfile
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

---

## 9. Testes automatizados

```powershell
npm test
```

A suíte cobre, entre outros pontos:
- cálculo de saldo acumulado e resultado mensal;
- que um novo mês não contamina os indicadores do mês anterior;
- criação, edição e exclusão de movimentação e seu efeito imediato no saldo;
- validações obrigatórias (valor zero/negativo, tipo inválido, categoria inexistente/inativa, data inválida, descrição vazia);
- que todas as rotas de dados exigem autenticação;
- que uma movimentação criada por um usuário aparece para o outro (mesmo banco);
- exportação CSV.

## 10. Checklist de critérios de aceite (`docs/09_TESTES_E_ACEITE.md`)

| # | Cenário | Status |
|---|---|---|
| 1 | Saldo inicial | ✅ Coberto por teste automatizado |
| 2 | Compra (saída) | ✅ Coberto por teste automatizado |
| 3 | Novo mês não contamina o anterior | ✅ Coberto por teste automatizado |
| 4 | Edição recalcula saldo | ✅ Coberto por teste automatizado |
| 5 | Exclusão recalcula saldo/lista | ✅ Coberto por teste automatizado |
| 6 | Dois usuários, mesmo banco | ✅ Coberto por teste automatizado |
| 7 | Mobile 390×844 sem corte horizontal | ✅ Layout mobile-first implementado (cards, bottom-nav, FAB); validar visualmente no dispositivo real |
| 8 | Persistência após restart | ✅ Banco em `data/` fora do container/processo; validado manualmente |
| 9 | Validações obrigatórias | ✅ Coberto por teste automatizado |
| 10 | Segurança (401 sem sessão) | ✅ Coberto por teste automatizado |

---

## 11. Decisões técnicas tomadas

1. **`node:sqlite` em vez de `better-sqlite3`**: o driver nativo do Node (disponível a partir da 22.5) evita qualquer compilação nativa (node-gyp/Visual Studio Build Tools), o que simplifica drasticamente a instalação em Windows. A API é quase idêntica (`prepare/run/get/all`) e o módulo expõe também uma função `backup()` equivalente à API de backup do SQLite.
2. **Sessão persistida em SQLite** (store próprio, ~60 linhas) em vez de `MemoryStore` — evita perder sessões a cada restart/redeploy e evita depender de um pacote de sessão com driver SQLite nativo próprio (que reintroduziria o problema de compilação).
3. **bcryptjs** (puro JavaScript) em vez de `bcrypt` nativo — mesma robustez de hashing, sem dependência de compilação.
4. **Zod** para validação de payloads — mensagens de erro padronizadas e tipagem clara dos contratos de API.
5. **Schema + categorias padrão aplicados automaticamente no boot** (idempotente) — a criação dos dois usuários continua manual e explícita, garantindo que nenhuma senha padrão fique hardcoded no código.
6. **Endpoint adicional `GET /api/users`** (autenticado) — não estava no contrato original, mas é necessário para o filtro "usuário" da lista de movimentações (RF08) exibir nomes reais em vez de IDs.
7. **CSV exportado com BOM UTF-8** — garante acentuação correta ao abrir no Excel no Windows.
8. **Sem SPA "fake"**: toda a persistência é feita via API/SQLite; o frontend nunca usa `localStorage` como fonte de dados, apenas lê e grava via backend.
9. **Deploy na internet via Cloudflare Tunnel (Quick Tunnel) rodando no próprio PC**, em vez de uma VM na nuvem: tanto Google Cloud quanto Oracle Cloud exigem cartão de crédito com cobrança de verificação mesmo nas camadas "Always Free", o que foi descartado. O Cloudflare Tunnel não exige cartão, não precisa de domínio próprio nem abertura de porta no roteador. Trade-off aceito: a URL pública muda a cada reinício do túnel (mitigado por manter a URL atual sempre em um Gist privado, ver seção 5).
10. **`helmet` + rate limit geral de API** adicionados especificamente para o cenário de exposição à internet (além do rate limit de login já existente), já que o modelo de ameaças muda de "rede local confiável" para "internet pública". O cookie de sessão usa `secure: 'auto'`, que fica `Secure` automaticamente assim que a conexão chega via HTTPS (como acontece atrás do Cloudflare Tunnel).
11. **Scripts de supervisão em PowerShell** (`deploy/windows/`) em vez de Tarefas Agendadas do Windows: a criação de Scheduled Tasks exigiu permissão de administrador neste ambiente, então a inicialização automática usa a pasta "Inicializar" do próprio usuário (`shell:startup`) com lançadores `.vbs` silenciosos — não precisa de privilégios elevados.

### Observação sobre dependências

`npm audit` aponta uma vulnerabilidade moderada em `react-router-dom` (open redirect, relevante principalmente em cenários de SSR) sem uma versão corrigida na série 6.x usada aqui; como o app roda inteiramente client-side em uma LAN fechada e sem SSR, o risco foi considerado aceitável. Vulnerabilidades adicionais reportadas pertencem apenas a dependências de desenvolvimento (`vite`/`vitest`), usadas somente localmente para build/testes — não fazem parte do runtime de produção.
