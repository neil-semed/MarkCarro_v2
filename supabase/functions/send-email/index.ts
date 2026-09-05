// ============================================================
// MARKCARRO - Edge Function: send-email
// Envia e-mails via Resend (https://resend.com).
//
// Body esperado (JSON):
//   { "to": "alguem@exemplo.com" | ["a@x.com","b@y.com"],
//     "subject": "Assunto do e-mail",
//     "html": "<p>Corpo em HTML</p>" }
//
// Variáveis de ambiente (Secrets) necessárias no projeto Supabase:
//   RESEND_API_KEY  -> chave de API do Resend
//   RESEND_FROM     -> remetente verificado no Resend,
//                      ex: "MarkCarro <transporte@seudominio.com>"
//
// Deploy (com Supabase CLI já logado e linkado ao projeto):
//   supabase functions deploy send-email
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set RESEND_FROM="MarkCarro <transporte@seudominio.com>"
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "MarkCarro <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada nos secrets da função.");
    }

    const { to, subject, html, text } = await req.json();

    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new Error("Destinatário (to) é obrigatório.");
    }
    if (!subject) {
      throw new Error("Assunto (subject) é obrigatório.");
    }

    const payload: Record<string, any> = {
      from: RESEND_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
    };
    if (html) payload.html = html;
    if (text) payload.text = text;
    if (!html && !text) payload.text = "(sem conteúdo)";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const respBody = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new Error(respBody?.message || `Resend retornou status ${resp.status}`);
    }

    return new Response(JSON.stringify({ success: true, id: respBody?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 200, // sempre 200 pra não quebrar o fluxo do client (o client.functions.invoke trata via body.success)
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
