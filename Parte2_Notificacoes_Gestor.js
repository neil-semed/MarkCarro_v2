/**
 * ============================================================
 * MARKCARRO - PARTE 2 de 3
 * Cobre: Notificações (sino), Painel do Gestor, "Em Análise" automático,
 *        Confirmação com atribuição de condutor(es), Cancelamento
 * ============================================================
 * COLE ISSO EM UM ARQUIVO NOVO no Apps Script (não substitui a Parte 1).
 */

var COLUNAS_NOTIFICACOES = {
  ID: 0, EMAIL_DESTINATARIO: 1, TIPO: 2, MENSAGEM: 3, DATA_HORA: 4, LIDA: 5
};

// ============================================================
// NOTIFICAÇÕES (SINO)
// ============================================================

/**
 * Grava a notificação na aba (aparece no sino, com texto CURTO) e, se
 * enviarEmail=true, manda o e-mail com o corpo completo (corpoEmail).
 * Se corpoEmail não for informado, usa o resumoSino como corpo também.
 */
function enviarNotificacao(emailDestinatario, tipo, resumoSino, enviarEmail, assuntoEmail, corpoEmail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Notificacoes") || ss.insertSheet("Notificacoes");

  if (aba.getLastRow() === 0) {
    aba.appendRow(["ID","EmailDestinatario","Tipo","Mensagem","DataHora","Lida"]);
  }

  var id = "NOTIF-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  aba.appendRow([id, emailDestinatario, tipo, resumoSino, agora, "Não"]);

  if (enviarEmail && emailDestinatario) {
    try {
      var rodape = "\n\nTransporte - SEMED.\n\n(Essa mensagem foi gerada automaticamente)";
      GmailApp.sendEmail(emailDestinatario, assuntoEmail || "[MarkCarro] Atualização da sua solicitação", (corpoEmail || resumoSino) + rodape);
    } catch (e) {
      Logger.log("Erro ao enviar e-mail: " + e);
    }
  }

  return { sucesso: true, id: id };
}

function buscarNotificacoes(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Notificacoes");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var resultado = [];
  var C = COLUNAS_NOTIFICACOES;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";

  for (var i = data.length - 1; i >= 1; i--) { // mais recente primeiro
    var emailLinha = data[i][C.EMAIL_DESTINATARIO] ? data[i][C.EMAIL_DESTINATARIO].toString().trim().toLowerCase() : "";
    if (emailLinha !== emailBusca) continue;

    resultado.push({
      id: data[i][C.ID],
      tipo: data[i][C.TIPO],
      mensagem: data[i][C.MENSAGEM],
      dataHora: formatarDataHoraBR(data[i][C.DATA_HORA]),
      lida: data[i][C.LIDA] === "Sim"
    });
  }
  return resultado;
}

function contarNotificacoesNaoLidas(email) {
  var notifs = buscarNotificacoes(email);
  var count = 0;
  for (var i = 0; i < notifs.length; i++) if (!notifs[i].lida) count++;
  return count;
}

function marcarNotificacoesComoLidas(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Notificacoes");
  if (!aba) return { sucesso: false };

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_NOTIFICACOES;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    var emailLinha = data[i][C.EMAIL_DESTINATARIO] ? data[i][C.EMAIL_DESTINATARIO].toString().trim().toLowerCase() : "";
    if (emailLinha === emailBusca && data[i][C.LIDA] !== "Sim") {
      aba.getRange(i + 1, C.LIDA + 1).setValue("Sim");
    }
  }
  return { sucesso: true };
}

/** Manda uma notificação (só sino, sem e-mail) para todo mundo com Tipo = gestor ou admin. */
function notificarTodosGestores(mensagem) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return;

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;

  for (var i = 1; i < data.length; i++) {
    var tipo = data[i][C.TIPO] ? data[i][C.TIPO].toString().trim().toLowerCase() : "";
    if (tipo === "gestor" || tipo === "admin") {
      var email = data[i][C.EMAIL];
      if (email) enviarNotificacao(email, "aviso_gestor", mensagem, false);
    }
  }
}

// ============================================================
// PAINEL DO GESTOR
// ============================================================

function buscarTodasSolicitacoesGestor() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var resultado = [];
  var C = COLUNAS_SOLICITACOES;

  for (var i = 1; i < data.length; i++) {
    var id = data[i][C.ID];
    if (!id) continue;

    var emailCondutorIda = data[i][C.CONDUTOR_IDA] || "";
    var emailCondutorVolta = data[i][C.CONDUTOR_VOLTA] || "";

    var emailSolic = data[i][C.EMAIL_SOLICITANTE] ? data[i][C.EMAIL_SOLICITANTE].toString() : "";

    resultado.push({
      id: id.toString(),
      emailSolicitante: emailSolic,
      solicitanteNome: (data[i][C.NOME_SOLICITANTE_EXTERNO] ? data[i][C.NOME_SOLICITANTE_EXTERNO].toString() : "") || buscarNomeUsuario(emailSolic),
      dataSolicitacao: formatarDataBR(data[i][C.DATA_SOLICITACAO]),
      dataViagem: formatarDataBR(data[i][C.DATA_VIAGEM]),
      horaSaida: formatarHoraBR(data[i][C.HORA_SAIDA]),
      horaRetorno: formatarHoraBR(data[i][C.HORA_RETORNO]),
      origem: data[i][C.ORIGEM] ? data[i][C.ORIGEM].toString() : "",
      destino: data[i][C.DESTINO] ? data[i][C.DESTINO].toString() : "",
      unidade: data[i][C.UNIDADE] ? data[i][C.UNIDADE].toString() : "",
      setor: data[i][C.SETOR] ? data[i][C.SETOR].toString() : "",
      justificativa: data[i][C.JUSTIFICATIVA] ? data[i][C.JUSTIFICATIVA].toString() : "",
      tipoViagem: data[i][C.TIPO_VIAGEM] ? data[i][C.TIPO_VIAGEM].toString() : "",
      qtd: data[i][C.QTD] ? data[i][C.QTD].toString() : "",
      status: data[i][C.STATUS] ? data[i][C.STATUS].toString() : "Pendente",
      condutorIdaEmail: emailCondutorIda,
      condutorVoltaEmail: emailCondutorVolta,
      condutorIdaCodigo: emailCondutorIda ? obterCodigoCondutor(emailCondutorIda) : "",
      condutorVoltaCodigo: emailCondutorVolta ? obterCodigoCondutor(emailCondutorVolta) : ""
    });
  }
  return resultado;
}

function obterCodigoCondutor(email) {
  var c = buscarDadosCondutor(email);
  return c ? c.codigo : "";
}

/**
 * Automático: chamado quando o gestor abre/expande uma linha pela primeira vez.
 * Só avança Pendente -> Em Análise.
 */
function marcarEmAnalise(idSolicitacao) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  var data = aba.getDataRange().getValues();
  var C = COLUNAS_SOLICITACOES;

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.ID].toString().trim() === idSolicitacao.toString().trim()) {
      if (data[i][C.STATUS] === "Pendente") {
        aba.getRange(i + 1, C.STATUS + 1).setValue("Em Análise");
      }
      return { sucesso: true };
    }
  }
  return { sucesso: false };
}

/**
 * Função central do Painel do Gestor.
 * dados = {
 *   id, dataViagem, horaSaida, horaRetorno, origem, destino,
 *   justificativa, tipoViagem, qtd, condutorIdaEmail, condutorVoltaEmail,
 *   acao: "salvar" | "confirmar" | "cancelar"
 * }
 */
function atualizarSolicitacaoPeloGestor(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  var data = aba.getDataRange().getValues();
  var C = COLUNAS_SOLICITACOES;

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.ID].toString().trim() !== dados.id.toString().trim()) continue;

    var linha = i + 1;
    var anterior = {
      horaSaida: data[i][C.HORA_SAIDA],
      horaRetorno: data[i][C.HORA_RETORNO],
      origem: data[i][C.ORIGEM],
      destino: data[i][C.DESTINO],
      dataViagem: data[i][C.DATA_VIAGEM]
    };
    var dataSolicitacao = data[i][C.DATA_SOLICITACAO];
    var emailSolicitante = data[i][C.EMAIL_SOLICITANTE];
    var unidadeSol = data[i][C.UNIDADE];
    var setorSol = data[i][C.SETOR];
    var emailNotificacao = obterEmailNotificacao(unidadeSol, setorSol, emailSolicitante);
    var nomeSolicitante = (data[i][C.NOME_SOLICITANTE_EXTERNO] ? data[i][C.NOME_SOLICITANTE_EXTERNO].toString() : "") || buscarNomeUsuario(emailSolicitante);
    var statusAtual = data[i][C.STATUS];

    // grava as edições de campo, independente da ação
    aba.getRange(linha, C.DATA_VIAGEM + 1).setValue(dados.dataViagem);
    aba.getRange(linha, C.HORA_SAIDA + 1).setValue(dados.horaSaida);
    aba.getRange(linha, C.HORA_RETORNO + 1).setValue(dados.horaRetorno);
    aba.getRange(linha, C.ORIGEM + 1).setValue(dados.origem);
    aba.getRange(linha, C.DESTINO + 1).setValue(dados.destino);
    aba.getRange(linha, C.JUSTIFICATIVA + 1).setValue(dados.justificativa);
    aba.getRange(linha, C.TIPO_VIAGEM + 1).setValue(dados.tipoViagem);
    aba.getRange(linha, C.QTD + 1).setValue(dados.qtd);

    var houveMudancaHorarioLocal =
      anterior.horaSaida != dados.horaSaida ||
      anterior.horaRetorno != dados.horaRetorno ||
      anterior.origem != dados.origem ||
      anterior.destino != dados.destino ||
      anterior.dataViagem != dados.dataViagem;

    // corrida "extra" = pedida hoje, para hoje (fora da agenda enviada no dia anterior)
    var ehExtra = (dataSolicitacao === dados.dataViagem);

    if (dados.acao === "confirmar") {
      if (!dados.condutorIdaEmail) {
        return { sucesso: false, mensagem: "Selecione ao menos o condutor de ida antes de confirmar." };
      }
      aba.getRange(linha, C.CONDUTOR_IDA + 1).setValue(dados.condutorIdaEmail);
      aba.getRange(linha, C.CONDUTOR_VOLTA + 1).setValue(dados.condutorVoltaEmail || "");
      aba.getRange(linha, C.STATUS + 1).setValue("Confirmada");
      aba.getRange(linha, C.DATA_CANC_CONF + 1).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));

      enviarMensagemConfirmacao(emailNotificacao, nomeSolicitante, {
        destino: dados.destino, dataViagem: dados.dataViagem,
        horaSaida: dados.horaSaida, horaRetorno: dados.horaRetorno, origem: dados.origem,
        condutorIdaEmail: dados.condutorIdaEmail, condutorVoltaEmail: dados.condutorVoltaEmail
      });

      // corrida extra -> avisa também o(s) condutor(es), só pelo sino (sem e-mail)
      if (ehExtra) {
        var msgExtraCondutor = "Nova corrida extra hoje: " + dados.origem + " → " + dados.destino +
          ". Saída " + dados.horaSaida + ", retorno " + dados.horaRetorno + ".";
        enviarNotificacao(dados.condutorIdaEmail, "corrida_extra", msgExtraCondutor, false);
        if (dados.condutorVoltaEmail && dados.condutorVoltaEmail !== dados.condutorIdaEmail) {
          enviarNotificacao(dados.condutorVoltaEmail, "corrida_extra", msgExtraCondutor, false);
        }
      }

      return { sucesso: true, mensagem: "Solicitação confirmada e solicitante notificado!" };
    }

    if (dados.acao === "ocupado") {
      aba.getRange(linha, C.STATUS + 1).setValue("Ocupado");
      aba.getRange(linha, C.DATA_CANC_CONF + 1).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));

      var msgOcupadoEmail =
        "Prezada(o) " + nomeSolicitante + ",\n\n" +
        "Informamos que sua solicitação de transporte à(ao) " + dados.destino +
        ", agendada para " + dados.dataViagem + ", está com o status de OCUPADO.\n" +
        "Lamentamos! Por questões operacionais, não será possível atender sua solicitação de transporte. " +
        "Recomendamos realizar uma nova solicitação com data ou horário alternativo.\n\n" +
        "Dados da solicitação:\n" +
        "Data da viagem: " + dados.dataViagem + ".\n" +
        "Horário de saída: " + dados.horaSaida + "h.\n" +
        "Horário de retorno: " + dados.horaRetorno + "h.\n" +
        "Origem: " + dados.origem + ".\n" +
        "Destino: " + dados.destino + ".\n" +
        "Número de passageiros: " + dados.qtd + ".";

      var agoraOcupado = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      enviarNotificacao(emailNotificacao, "ocupado", "Status: Ocupado — " + agoraOcupado, true,
        "[MarkCarro] Indisponibilidade de veículo", msgOcupadoEmail);

      return { sucesso: true, mensagem: "Solicitação marcada como Ocupado e setor notificado!" };
    }

    if (dados.acao === "cancelar") {
      aba.getRange(linha, C.STATUS + 1).setValue("Cancelada");
      aba.getRange(linha, C.DATA_CANC_CONF + 1).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));

      var msgCancelEmail =
        "Prezada(o) " + nomeSolicitante + ",\n\n" +
        "Informamos que sua solicitação de transporte para " + dados.destino +
        ", agendada para " + dados.dataViagem + ", foi CANCELADA.";

      var agoraCancel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      enviarNotificacao(emailNotificacao, "cancelamento", "Status: Cancelada — " + agoraCancel, true,
        "[MarkCarro] Cancelamento de Viagem", msgCancelEmail);

      return { sucesso: true, mensagem: "Solicitação cancelada e solicitante notificado!" };
    }

    // ação "salvar" (edição simples, sem mudar status) -> notifica só se já confirmada e mudou horário/local
    if (houveMudancaHorarioLocal && statusAtual === "Confirmada") {
      var msgAjusteEmail =
        "Prezada(o) " + nomeSolicitante + ",\n\n" +
        "Houve um ajuste na sua viagem para " + dados.destino + " (" + dados.dataViagem + "). " +
        "Novo horário: saída " + dados.horaSaida + ", retorno " + dados.horaRetorno + ". Origem: " + dados.origem + ".";
      var agoraAjuste = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      enviarNotificacao(emailNotificacao, "ajuste", "Status: Confirmada (ajuste) — " + agoraAjuste, true,
        "[MarkCarro] Ajuste na sua viagem", msgAjusteEmail);
    }

    return { sucesso: true, mensagem: "Alterações salvas!" };
  }

  return { sucesso: false, mensagem: "Solicitação não encontrada." };
}

/**
 * Monta e envia a mensagem completa de confirmação, no padrão dos e-mails
 * que a SEMED já usa hoje, buscando telefone/placa/veículo automaticamente
 * do cadastro do(s) condutor(es) — nunca digitado à mão.
 */
function enviarMensagemConfirmacao(emailDestino, nomeSolicitante, viagem) {
  var condIda = buscarDadosCondutor(viagem.condutorIdaEmail);
  var condVolta = viagem.condutorVoltaEmail ? buscarDadosCondutor(viagem.condutorVoltaEmail) : null;

  var blocoCondutor = "Favor contatar o(a) motorista responsável: " + (condIda ? condIda.codigo : "-") + ".\n" +
    "Celular: " + (condIda ? condIda.telefone : "-") +
    " | Placa: " + (condIda ? condIda.placa : "-") +
    (condIda ? " | Veículo: " + condIda.modelo : "");

  if (condVolta && viagem.condutorVoltaEmail !== viagem.condutorIdaEmail) {
    blocoCondutor += "\n\nCondutor de volta: " + condVolta.codigo + ".\n" +
      "Celular: " + condVolta.telefone + " | Placa: " + condVolta.placa + " | Veículo: " + condVolta.modelo;
  }

  var mensagemEmail =
    "Prezada(o) " + nomeSolicitante + ",\n\n" +
    "Informamos que sua solicitação de transporte à(ao) " + viagem.destino +
    ", agendada para " + viagem.dataViagem + ", está com o status de CONFIRMADA.\n\n" +
    blocoCondutor + "\n\n" +
    "A tolerância para embarque é de até 5 minutos. O não comparecimento dentro desse prazo poderá acarretar o cancelamento da viagem.\n\n" +
    "Dados do agendamento:\n" +
    "Data: " + viagem.dataViagem + "\n" +
    "Horário de saída: " + viagem.horaSaida + "\n" +
    "Horário de retorno: " + viagem.horaRetorno + "\n" +
    "Origem: " + viagem.origem + "\n" +
    "Destino: " + viagem.destino;

  var rodape = "\n\nTransporte - SEMED.\n\n(Essa mensagem foi gerada automaticamente)";
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  enviarNotificacao(emailDestino, "confirmacao", "Status: Confirmada — " + agora, true,
    "[MarkCarro] Confirmação de Viagem", mensagemEmail + rodape);
}
