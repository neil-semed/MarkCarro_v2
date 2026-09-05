# send-email (Supabase Edge Function)

Envia e-mails via [Resend](https://resend.com). Usada pelo `supabase-client.js`
(`_enviarEmail`) para notificar solicitantes (recebimento, confirmação,
ocupado, cancelamento, ajuste) e para o botão "Enviar Agenda por E-mail" do
Gestor.

## 1. Criar conta no Resend

1. Crie uma conta em https://resend.com (tem plano gratuito).
2. Em **API Keys**, crie uma chave (`re_...`).
3. Em **Domains**, verifique um domínio seu (recomendado) **ou**, para testar
   rapidamente sem domínio próprio, use o remetente de teste
   `onboarding@resend.dev` (só envia para o e-mail da conta Resend).

## 2. Deploy da função

Com a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada:

```bash
supabase login
supabase link --project-ref xzltbjinzlrzfrwdqtxm
supabase functions deploy send-email
```

## 3. Configurar os secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
supabase secrets set RESEND_FROM="MarkCarro <transporte@seudominio.com>"
```

(Se ainda não tiver domínio verificado no Resend, use temporariamente
`RESEND_FROM="MarkCarro <onboarding@resend.dev>"` — funciona apenas para
enviar para o próprio e-mail cadastrado na conta Resend, então troque assim
que verificar um domínio.)

## 4. Testar

```bash
curl -X POST 'https://xzltbjinzlrzfrwdqtxm.supabase.co/functions/v1/send-email' \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"seuemail@exemplo.com","subject":"Teste MarkCarro","html":"<p>Funcionou!</p>"}'
```

Resposta esperada: `{"success":true,"id":"..."}`.
