# MarkCarro v2 - Sistema de Gestão de Transportes SEMED Nova Lima

## 📋 Visão Geral

Sistema completo para agendamento e gestão de veículos da SEMED Nova Lima, migrado de Google Apps Script para **Supabase + GitHub Pages**.

### Perfis de Usuário
- **Admin/Gestor**: Painel completo, gerencia solicitações, condutores, KM, usuários
- **Solicitante**: Cria solicitações, vê suas solicitações, dashboard
- **Condutor**: Vê sua agenda, registra KM, painel do dia

---

## 🚀 Deploy no GitHub Pages + Supabase

### 1. Configurar Supabase

#### A. Criar Projeto
1. Acesse [supabase.com](https://supabase.com) e crie novo projeto
2. Anote: **Project URL** e **anon public key**

#### B. Executar Schema
No **SQL Editor** do Supabase, execute:
```sql
-- Cole o conteúdo de supabase-schema.sql
```

#### C. Criar Usuários no Auth
**Opção 1 - Dashboard (manual):**
- Authentication → Users → Add user → Create new user
- Crie cada usuário com email/senha `trocar-123`
- User Metadata: `{ "tipo": "condutor|solicitante|admin", "nome": "Nome Completo" }`

**Opção 2 - Script Automatizado (recomendado):**
```bash
# 1. Configure a service role key
cp create-auth-users.js create-auth-users.local.js
# Edite create-auth-users.local.js e coloque sua SERVICE_ROLE_KEY

# 2. Instale dependências e rode
npm install @supabase/supabase-js
node create-auth-users.local.js
```

#### D. Popular Dados (Migração)
Após criar os usuários no Auth, execute no **SQL Editor**:
```sql
-- Cole o conteúdo de supabase-migracao-corrigida.sql
```

#### E. Configurar RLS e Policies
O schema já inclui RLS. Verifique se policies estão ativas nas tabelas.

### 2. Configurar GitHub Pages

#### A. Criar Repositório
```bash
git init
git add .
git commit -m "MarkCarro v2 - Deploy inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/MarkCarro_v2.git
git push -u origin main
```

#### B. Ativar GitHub Pages
1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **main** / **/(root)**
4. Save

#### C. Configurar Variáveis no index.html
Edite `index.html` e atualize:
```javascript
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

Ou crie `config.js` (já incluído) com suas credenciais.

### 3. Configurar Domínio Personalizado (Opcional)
- Settings → Pages → Custom domain
- Adicione CNAME no DNS apontando para `seu-usuario.github.io`

---

## 📁 Estrutura de Arquivos

```
MarkCarro_v2/
├── index.html              # Página principal (GitHub Pages)
├── config.js               # Configuração Supabase (URL, Keys)
├── supabase-client.js      # Cliente Supabase + API functions
├── api.js                  # Wrapper REST API
├── utils.js                # Utilitários (datas, formatação)
├── components.js           # Componentes UI (Toast, Modal, Loading)
├── app.js                  # Orquestração principal + navegação
├── pages/
│   ├── login.js           # Login + sessão + perfil
│   ├── cadastro.js        # Cadastro de usuários
│   ├── nova-solicitacao.js # Nova solicitação
│   ├── minhas-solicitacoes.js # Minhas solicitações
│   ├── agenda.js          # Agenda (Gestor)
│   ├── agenda-condutor.js # Agenda (Condutor)
│   ├── registro-km.js     # Registro de KM
│   ├── gestor.js          # Painel do Gestor (edição inline)
│   ├── gerenciar-condutores.js # CRUD Condutores
│   ├── gerenciar-km.js    # Gerenciar KM (Gestor)
│   ├── gerenciar-usuarios.js # CRUD Solicitantes
│   └── alterar-senha.js   # Alterar senha
├── supabase-schema.sql           # Schema completo (rode primeiro)
├── supabase-migracao-corrigida.sql # Dados iniciais (rode depois)
├── create-auth-users.js          # Script para criar users no Auth
└── README.md
```

---

## 🔧 Configuração de Ambiente

### Variáveis Necessárias (config.js)
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://xzltbjinzlrzfrwdqtxm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  APP_NAME: 'MarkCarro',
  ORGAO: 'SEMED Nova Lima'
};
```

### Service Role Key (para scripts admin)
- Settings → API → **service_role** (secret)
- **NUNCA** exponha no frontend

---

## 🗄️ Banco de Dados - Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis estendidos dos usuários (FK auth.users.id) |
| `solicitacoes` | Solicitações de transporte |
| `locais` | Locais cadastrados (origem/destino) |
| `tabelas_apoio` | Unidades/Setores/Emails para notificação |
| `notificacoes` | Notificações (sino) |
| `registros_km` | Controle de quilometragem |

### Trigger Automático
```sql
-- Cria perfil automaticamente no signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔐 Autenticação e Sessão

- **Login**: `supabase.auth.signInWithPassword()`
- **Cadastro**: `supabase.auth.signUp()` + metadata (tipo, nome)
- **Sessão**: `sessionStorage` (sobrevive a F5, limpa ao fechar aba)
- **Perfil**: Buscado por `auth.uid()` ou email (fallback para migração)

### Fluxo de Login
```javascript
1. supabaseLogin(email, senha) → retorna user + session
2. buscarPerfil(user.id, user.email) → busca na tabela profiles
3. Se encontrado → salva em sessionStorage → carrega painel
4. Se não encontrado → erro "Perfil não encontrado"
```

---

## 📱 Funcionalidades por Perfil

### Admin/Gestor
- ✅ Painel com tabela editável inline
- ✅ Confirmar/Cancelar/Ocupado solicitações
- ✅ Atribuir condutores (ida/volta)
- ✅ Agenda de corridas + envio por e-mail
- ✅ Gerenciar condutores (CRUD + agenda geral)
- ✅ Gerenciar KM (lançar/corrigir)
- ✅ Gerenciar usuários/solicitantes
- ✅ Dashboard com gráficos (Pareto, KM, timeline)
- ✅ Exportar Excel

### Solicitante
- ✅ Nova solicitação (com unidade/setor em cascata)
- ✅ Minhas solicitações (filtros + exportar)
- ✅ Cancelar própria solicitação (até 30 min antes)
- ✅ Dashboard pessoal (Pareto por status)

### Condutor
- ✅ Painel do dia (corridas de hoje)
- ✅ Minha agenda (filtros por data)
- ✅ Registrar KM (inicial/final)
- ✅ Histórico de KM
- ✅ Agenda geral (se autorizado pelo gestor)

---

## 🛠️ Desenvolvimento Local

### Opção 1: VS Code Live Server
```bash
# Instale extensão "Live Server" no VS Code
# Clique com botão direito no index.html → "Open with Live Server"
```

### Opção 2: Python HTTP Server
```bash
python -m http.server 8080
# Acesse http://localhost:8080
```

### Opção 3: Node http-server
```bash
npx http-server -p 8080
```

---

## 🐛 Troubleshooting

### "Perfil não encontrado" no login
**Causa**: Usuário existe no Auth mas não na tabela `profiles`
**Solução**: 
1. Verifique se o trigger `handle_new_user` está ativo
2. Rode `supabase-migracao-corrigida.sql` para usuários existentes
3. Função `buscarPerfil` já tenta buscar por email como fallback

### Erro CORS no GitHub Pages
**Causa**: Supabase bloqueia domínio
**Solução**: 
- Settings → API → **Additional Allowed Origins** → adicione `https://seu-usuario.github.io`

### RLS bloqueando queries
**Causa**: Policies não permitem a operação
**Solução**: Verifique policies no SQL Editor:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### "Invalid JWT" ou sessão expira
**Causa**: Token expirado
**Solução**: 
- Implementar refresh token automático
- Ou aumentar `jwt_expiry` no Supabase (Settings → Auth)

---

## 📝 Checklist de Deploy

- [ ] Projeto Supabase criado
- [ ] Schema executado (`supabase-schema.sql`)
- [ ] Usuários criados no Auth (Dashboard ou script)
- [ ] Migração de dados executada (`supabase-migracao-corrigida.sql`)
- [ ] RLS e Policies verificadas
- [ ] Repositório GitHub criado
- [ ] GitHub Pages ativado (branch main, root)
- [ ] `config.js` atualizado com credenciais corretas
- [ ] Domínio personalizado configurado (opcional)
- [ ] Testado login com cada perfil
- [ ] Testado fluxo completo: solicitação → confirmação → KM

---

## 📞 Suporte

- **Issues**: GitHub Issues do repositório
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## 📄 Licença

Uso interno - SEMED Nova Lima