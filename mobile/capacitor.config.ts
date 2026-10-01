import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.org.semednovalima.markcarro',
  appName: 'MarkCarro',
  webDir: 'www',
  // CORREÇÃO ("cadastro pelo apk não salva telefone/unidade/setor"): por
  // padrão o Capacitor intercepta TODO fetch()/XMLHttpRequest da página e
  // reenvia por um plugin nativo próprio (CapacitorHttp), em vez de deixar
  // o WebView do Android lidar com a requisição como um navegador normal
  // faria. Isso quebra chamadas específicas do supabase-js (como as de RPC,
  // ex.: completar_cadastro_proprio, que enviam um corpo JSON em POST) - o
  // corpo chega vazio/incompleto do outro lado, então a função salva só o
  // que o próprio gatilho do banco já grava (nome/e-mail), e os campos
  // extras (telefone/Unidade/Setor/placa etc.) nunca são gravados, SEM erro
  // nenhum visível no app. Pelo navegador normal (fora do apk) isso nunca
  // acontecia, porque não existe esse plugin interceptando nada. Desativar
  // aqui faz o app instalado usar o fetch/XHR padrão do WebView, igual ao
  // navegador - mesmo comportamento, mesmo resultado nos dois lugares.
  plugins: {
    CapacitorHttp: {
      enabled: false
    }
  }
};

export default config;
