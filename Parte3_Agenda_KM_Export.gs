/**
 * ============================================================
 * MARKCARRO - PARTE 3 de 3
 * Cobre: Agenda do Gestor (+ envio por e-mail), Agenda do Condutor,
 *        Registro de KM, Dashboards de KM, Exportação em .xlsx
 * ============================================================
 * COLE ISSO EM UM ARQUIVO NOVO no Apps Script (não substitui nada).
 */

var COLUNAS_KM = {
  DATA: 0, EMAIL_CONDUTOR: 1, KM_INICIAL: 2, KM_FINAL: 3, KM_RODADO: 4, AJUSTADO: 5
};

// ============================================================
// AGENDA — GESTOR
// ============================================================

function parseDataBR(str) {
  if (!str) return null;
  var partes = str.toString().split("/");
  if (partes.length !== 3) return null;
  return new Date(partes[2], partes[1] - 1, partes[0]);
}

function buscarTelefoneSolicitante(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return "";
  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";
  for (var i = 1; i < data.length; i++) {
    var e = data[i][C.EMAIL] ? data[i][C.EMAIL].toString().trim().toLowerCase() : "";
    if (e === emailBusca) return data[i][C.TELEFONE];
  }
  return "";
}

/**
 * Atualiza SÓ os campos editáveis na tela Agenda de Corridas
 * (Data Viagem, Horários, Origem, Destino, Qtd) — nunca mexe em
 * Condutor ou Status, que continuam só pelo Painel do Gestor.
 */
function atualizarCamposAgenda(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  var data = aba.getDataRange().getValues();
  var C = COLUNAS_SOLICITACOES;

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.ID].toString().trim() !== dados.id.toString().trim()) continue;

    var linha = i + 1;
    aba.getRange(linha, C.DATA_VIAGEM + 1).setValue(dados.dataViagem);
    aba.getRange(linha, C.HORA_SAIDA + 1).setValue(dados.horaSaida);
    aba.getRange(linha, C.HORA_RETORNO + 1).setValue(dados.horaRetorno);
    aba.getRange(linha, C.ORIGEM + 1).setValue(dados.origem);
    aba.getRange(linha, C.DESTINO + 1).setValue(dados.destino);
    aba.getRange(linha, C.QTD + 1).setValue(dados.qtd);

    return { sucesso: true, mensagem: "Corrida atualizada!" };
  }
  return { sucesso: false, mensagem: "Solicitação não encontrada." };
}

/** Usada pela tela Agenda do gestor. Datas no formato dd/MM/yyyy. */
function buscarDadosAgenda(dataInicioBR, dataFimBR) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_SOLICITACOES;
  var dataInicio = parseDataBR(dataInicioBR);
  var dataFim = parseDataBR(dataFimBR);
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    var dataViagemStr = formatarDataBR(data[i][C.DATA_VIAGEM]);
    var dataViagem = parseDataBR(dataViagemStr);
    if (!dataViagem || !dataInicio || !dataFim || dataViagem < dataInicio || dataViagem > dataFim) continue;
    if (data[i][C.STATUS] === "Cancelada") continue;

    var emailSolicitante = data[i][C.EMAIL_SOLICITANTE];
    var emailCondutorIda = data[i][C.CONDUTOR_IDA] || "";

    resultado.push({
      id: data[i][C.ID],
      dataViagem: formatarDataBR(data[i][C.DATA_VIAGEM]),
      horaSaida: formatarHoraBR(data[i][C.HORA_SAIDA]),
      horaRetorno: formatarHoraBR(data[i][C.HORA_RETORNO]),
      origem: data[i][C.ORIGEM],
      destino: data[i][C.DESTINO],
      solicitante: (data[i][C.NOME_SOLICITANTE_EXTERNO] ? data[i][C.NOME_SOLICITANTE_EXTERNO].toString() : "") || buscarNomeUsuario(emailSolicitante),
      celularSolicitante: buscarTelefoneSolicitante(emailSolicitante),
      setor: data[i][C.SETOR] ? data[i][C.SETOR].toString() : "",
      qtd: data[i][C.QTD],
      condutorCodigo: emailCondutorIda ? obterCodigoCondutor(emailCondutorIda) : "",
      justificativa: data[i][C.JUSTIFICATIVA] ? data[i][C.JUSTIFICATIVA].toString() : "",
      status: data[i][C.STATUS]
    });
  }

  resultado.sort(function (a, b) {
    var diffData = parseDataBR(a.dataViagem) - parseDataBR(b.dataViagem);
    if (diffData !== 0) return diffData;
    return (a.horaSaida || "").localeCompare(b.horaSaida || "");
  });

  return resultado;
}

function buscarListaEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Lista_emails");
  if (!aba) return [];
  var data = aba.getDataRange().getValues();
  var emails = [];
  for (var i = 1; i < data.length; i++) {
    var email = data[i][0] ? data[i][0].toString().trim() : "";
    if (email) emails.push(email);
  }
  return emails;
}

function montarHtmlAgenda(agenda, dataBR) {
  var linhas = agenda.map(function (a) {
    return "<tr>" +
      "<td>" + a.horaSaida + " → " + a.horaRetorno + "</td>" +
      "<td>" + a.origem + " → " + a.destino + "</td>" +
      "<td>" + a.solicitante + "</td>" +
      "<td>" + a.celularSolicitante + "</td>" +
      "<td>" + a.qtd + "</td>" +
      "<td>" + a.condutorCodigo + "</td>" +
      "<td>" + a.status + "</td>" +
      "</tr>";
  }).join("");

  return "<h3>Agenda de Corridas - " + dataBR + "</h3>" +
    "<table border='1' cellpadding='6' style='border-collapse:collapse;font-family:sans-serif;font-size:13px;'>" +
    "<tr><th>Horário</th><th>Origem → Destino</th><th>Solicitante</th><th>Celular</th><th>Pass</th><th>Condutor</th><th>Status</th></tr>" +
    linhas + "</table>" +
    "<br><p style='color:#666;font-size:12px;'>Transporte - SEMED.<br><em>(Essa mensagem foi gerada automaticamente)</em></p>";
}

/** Botão "Enviar Agenda por E-mail" — manda a agenda de UM dia para a Lista_emails. */
function enviarAgendaPorEmail(dataBR) {
  var agenda = buscarDadosAgenda(dataBR, dataBR);
  if (agenda.length === 0) {
    return { sucesso: false, mensagem: "Não há corridas para essa data." };
  }

  var destinatarios = buscarListaEmails();
  if (destinatarios.length === 0) {
    return { sucesso: false, mensagem: "Nenhum e-mail cadastrado na aba Lista_emails." };
  }

  var html = montarHtmlAgenda(agenda, dataBR);

  destinatarios.forEach(function (email) {
    try {
      GmailApp.sendEmail(email, "[MarkCarro] Agenda de Corridas - " + dataBR, "", { htmlBody: html });
    } catch (e) {
      Logger.log("Erro ao enviar agenda para " + email + ": " + e);
    }
  });

  return { sucesso: true, mensagem: "Agenda enviada para " + destinatarios.length + " destinatário(s)." };
}

// ============================================================
// AGENDA — CONDUTOR (pessoal + consulta geral)
// ============================================================

/**
 * @param {string} [dataInicioBR] dd/MM/yyyy - opcional. Se omitido (junto com dataFimBR),
 *   traz TODAS as corridas do condutor (passadas e futuras).
 * @param {string} [dataFimBR] dd/MM/yyyy - opcional.
 */
function buscarViagensCondutor(emailCondutor, dataInicioBR, dataFimBR) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_SOLICITACOES;
  var resultado = [];
  var emailBusca = emailCondutor ? emailCondutor.toString().trim().toLowerCase() : "";

  var filtrarPeriodo = !!(dataInicioBR && dataFimBR);
  var dataInicio = filtrarPeriodo ? parseDataBR(dataInicioBR) : null;
  var dataFim = filtrarPeriodo ? parseDataBR(dataFimBR) : null;

  for (var i = 1; i < data.length; i++) {
    var condIda = data[i][C.CONDUTOR_IDA] ? data[i][C.CONDUTOR_IDA].toString().trim().toLowerCase() : "";
    var condVolta = data[i][C.CONDUTOR_VOLTA] ? data[i][C.CONDUTOR_VOLTA].toString().trim().toLowerCase() : "";
    if (condIda !== emailBusca && condVolta !== emailBusca) continue;
    if (data[i][C.STATUS] === "Cancelada" || data[i][C.STATUS] === "Desprezado") continue;

    var dataViagem = formatarDataBR(data[i][C.DATA_VIAGEM]);

    if (filtrarPeriodo) {
      var dObj = parseDataBR(dataViagem);
      if (!dObj || dObj < dataInicio || dObj > dataFim) continue;
    }
    let papel;
    if (condIda === emailBusca && (condVolta === emailBusca || condVolta === "")) {
      papel = "ida_e_volta";
    } else if (condIda === emailBusca) {
      papel = "ida";
    } else {
      papel = "volta";
    }

    var ehExtra = (formatarDataBR(data[i][C.DATA_SOLICITACAO]) === dataViagem);

    resultado.push({
      id: data[i][C.ID],
      dataViagem: dataViagem,
      horaSaida: formatarHoraBR(data[i][C.HORA_SAIDA]),
      horaRetorno: formatarHoraBR(data[i][C.HORA_RETORNO]),
      origem: data[i][C.ORIGEM],
      destino: data[i][C.DESTINO],
      qtd: data[i][C.QTD],
      tipoViagem: data[i][C.TIPO_VIAGEM],
      solicitante: (data[i][C.NOME_SOLICITANTE_EXTERNO] ? data[i][C.NOME_SOLICITANTE_EXTERNO].toString() : "") || buscarNomeUsuario(data[i][C.EMAIL_SOLICITANTE]),
      celularSolicitante: buscarTelefoneSolicitante(data[i][C.EMAIL_SOLICITANTE]),
      setor: data[i][C.SETOR] ? data[i][C.SETOR].toString() : "",
      justificativa: data[i][C.JUSTIFICATIVA] ? data[i][C.JUSTIFICATIVA].toString() : "",
      status: data[i][C.STATUS],
      papel: papel,
      isExtra: ehExtra
    });
  }

  resultado.sort(function (a, b) {
    var diffData = parseDataBR(a.dataViagem) - parseDataBR(b.dataViagem);
    if (diffData !== 0) return diffData;
    return (a.horaSaida || "").localeCompare(b.horaSaida || "");
  });

  return resultado;
}

/** Agenda geral, só para consulta (qualquer condutor pode ver quem está fazendo o quê). */
function buscarAgendaGeralParaCondutor(dataInicioBR, dataFimBR) {
  return buscarDadosAgenda(dataInicioBR, dataFimBR);
}

// ============================================================
// REGISTRO DE KM (por condutor, não por veículo)
// ============================================================

function registrarKmInicial(emailCondutor, kmInicial) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM") || ss.insertSheet("RegistroKM");
  if (aba.getLastRow() === 0) {
    aba.appendRow(["Data", "EmailCondutor", "KmInicial", "KmFinal", "KmRodado", "AjustadoPeloGestor"]);
  }

  var hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  if (buscarRegistroKmDoDia(emailCondutor, hoje)) {
    return { sucesso: false, mensagem: "O km inicial de hoje já foi lançado." };
  }

  aba.appendRow([hoje, emailCondutor, kmInicial, "", "", "Não"]);
  return { sucesso: true, mensagem: "Km inicial registrado!" };
}
/** @param {string} dataRegistroBR - a data (dd/MM/yyyy) daquele km inicial (hoje ou ontem, se completando com atraso). */
function registrarKmFinal(emailCondutor, kmFinal, dataRegistroBR) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM");
  if (!aba) return { sucesso: false, mensagem: "Aba RegistroKM não encontrada." };

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_KM;
  var emailBusca = emailCondutor.toString().trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var emailLinha = data[i][C.EMAIL_CONDUTOR] ? data[i][C.EMAIL_CONDUTOR].toString().trim().toLowerCase() : "";
    var dataLinha = formatarDataBR(data[i][C.DATA]);
    if (emailLinha === emailBusca && dataLinha === dataRegistroBR) {
      var kmInicial = Number(data[i][C.KM_INICIAL]);
      var kmRodado = Number(kmFinal) - kmInicial;
      aba.getRange(i + 1, C.KM_FINAL + 1).setValue(kmFinal);
      aba.getRange(i + 1, C.KM_RODADO + 1).setValue(kmRodado);
      return { sucesso: true, mensagem: "Km final registrado! Total do dia: " + kmRodado + " km." };
    }
  }
  return { sucesso: false, mensagem: "Não foi encontrado km inicial para essa data." };
}

function buscarRegistroKmDoDia(emailCondutor, dataBR) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM");
  if (!aba) return null;

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_KM;
  var emailBusca = emailCondutor.toString().trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var emailLinha = data[i][C.EMAIL_CONDUTOR] ? data[i][C.EMAIL_CONDUTOR].toString().trim().toLowerCase() : "";
    var dataLinha = formatarDataBR(data[i][C.DATA]);
    if (emailLinha === emailBusca && dataLinha === dataBR) {
      return {
        data: dataLinha,
        kmInicial: data[i][C.KM_INICIAL],
        kmFinal: data[i][C.KM_FINAL],
        kmRodado: data[i][C.KM_RODADO]
      };
    }
  }
  return null;
}

/**
 * Diz o que a tela de Registro de Km deve mostrar ao condutor assim que ele entra:
 * - "completo": já lançou os dois hoje
 * - "aguardando_final": já lançou o inicial de hoje, falta o final
 * - "pendente_dia_anterior": esqueceu de lançar o final de um dia passado
 * - "sem_registro_hoje": ainda não lançou nada hoje
 */
function buscarStatusKmHoje(emailCondutor) {
  var hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var registroHoje = buscarRegistroKmDoDia(emailCondutor, hoje);

  if (registroHoje && registroHoje.kmFinal !== "") {
    return { status: "completo", registro: registroHoje };
  }
  if (registroHoje) {
    return { status: "aguardando_final", registro: registroHoje };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM");
  if (aba) {
    var data = aba.getDataRange().getValues();
    var C = COLUNAS_KM;
    var emailBusca = emailCondutor.toString().trim().toLowerCase();
    for (var i = data.length - 1; i >= 1; i--) {
      var emailLinha = data[i][C.EMAIL_CONDUTOR] ? data[i][C.EMAIL_CONDUTOR].toString().trim().toLowerCase() : "";
      if (emailLinha === emailBusca && data[i][C.KM_FINAL] === "") {
        return { status: "pendente_dia_anterior", registro: { data: formatarDataBR(data[i][C.DATA]), kmInicial: data[i][C.KM_INICIAL] } };
      }
    }
  }
  return { status: "sem_registro_hoje" };
}

// ============================================================
// DASHBOARDS DE KM
// ============================================================

function buscarDashboardKmCondutor(emailCondutor) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_KM;
  var emailBusca = emailCondutor.toString().trim().toLowerCase();
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    var emailLinha = data[i][C.EMAIL_CONDUTOR] ? data[i][C.EMAIL_CONDUTOR].toString().trim().toLowerCase() : "";
    if (emailLinha === emailBusca && data[i][C.KM_RODADO] !== "") {
      resultado.push({ data: formatarDataBR(data[i][C.DATA]), kmRodado: Number(data[i][C.KM_RODADO]) });
    }
  }
  return resultado;
}

/**
 * @param {Object} [filtros] { condutor } — por enquanto só filtra por condutor e período
 * (o período é aplicado no front, já que os dados vêm todos e o gráfico agrupa).
 * ⚠️ Ver observação importante nas instruções sobre os filtros de unidade/setor/solicitante.
 */
function buscarDashboardKmGestor(filtros) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_KM;
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.KM_RODADO] === "") continue;
    var email = data[i][C.EMAIL_CONDUTOR];
    if (filtros && filtros.condutor && email !== filtros.condutor) continue;

    resultado.push({
      data: data[i][C.DATA],
      condutorEmail: email,
      condutorCodigo: obterCodigoCondutor(email),
      kmRodado: Number(data[i][C.KM_RODADO])
    });
  }
  return resultado;
}

// ============================================================
// GESTÃO DE KM PELO GESTOR (lançar/corrigir manualmente)
// ============================================================

/** Lista TODOS os registros de Km (de todos os condutores), mais recente primeiro. */
function listarTodosRegistrosKm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_KM;
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][C.EMAIL_CONDUTOR]) continue;
    resultado.push({
      data: formatarDataBR(data[i][C.DATA]),
      emailCondutor: data[i][C.EMAIL_CONDUTOR],
      condutorCodigo: obterCodigoCondutor(data[i][C.EMAIL_CONDUTOR]),
      kmInicial: data[i][C.KM_INICIAL],
      kmFinal: data[i][C.KM_FINAL],
      kmRodado: data[i][C.KM_RODADO],
      ajustado: data[i][C.AJUSTADO]
    });
  }

  resultado.sort(function (a, b) {
    return parseDataBR(b.data) - parseDataBR(a.data);
  });

  return resultado;
}

/**
 * Cria ou corrige um registro de Km de um condutor, em qualquer data,
 * direto pelo Painel do Gestor. Marca AjustadoPeloGestor = "Sim".
 */
function salvarRegistroKmPeloGestor(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("RegistroKM") || ss.insertSheet("RegistroKM");

  if (aba.getLastRow() === 0) {
    aba.appendRow(["Data", "EmailCondutor", "KmInicial", "KmFinal", "KmRodado", "AjustadoPeloGestor"]);
  }

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_KM;
  var emailBusca = dados.emailCondutor ? dados.emailCondutor.toString().trim().toLowerCase() : "";
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    var e = data[i][C.EMAIL_CONDUTOR] ? data[i][C.EMAIL_CONDUTOR].toString().trim().toLowerCase() : "";
    var d = formatarDataBR(data[i][C.DATA]);
    if (e === emailBusca && d === dados.dataBR) { rowIndex = i + 1; break; }
  }

  var kmInicial = Number(dados.kmInicial);
  var kmFinal = (dados.kmFinal !== "" && dados.kmFinal !== null && dados.kmFinal !== undefined) ? Number(dados.kmFinal) : "";
  var kmRodado = kmFinal !== "" ? (kmFinal - kmInicial) : "";

  var linha = [dados.dataBR, dados.emailCondutor, kmInicial, kmFinal, kmRodado, "Sim"];

  if (rowIndex > 0) {
    aba.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    aba.appendRow(linha);
  }

  return { sucesso: true, mensagem: "Registro de Km salvo!" };
}

// ============================================================
// EXPORTAÇÃO (.xlsx, sempre tudo)
// ============================================================

function exportarSolicitacoesXlsx() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaOrigem = ss.getSheetByName("Solicitacoes");
  var dados = abaOrigem.getDataRange().getValues();
  return gerarXlsxDeMatriz(dados, "MarkCarro_Solicitacoes_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "ddMMyyyy") + ".xlsx");
}

/** Exporta a lista de condutores (todos os campos) em .xlsx. */
function exportarCondutoresXlsx() {
  var lista = listarCondutoresCompleto();
  var cabecalho = ["Nome", "Email", "Telefone", "Categoria", "Placa", "Modelo", "Capacidade", "CNH", "Validade CNH"];
  var linhas = [cabecalho];
  lista.forEach(function (c) {
    linhas.push([c.nome, c.email, c.telefone, c.categoria, c.placa, c.modelo, c.capacidade, c.cnh, c.validadeCnh]);
  });
  return gerarXlsxDeMatriz(linhas, "MarkCarro_Condutores_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "ddMMyyyy") + ".xlsx");
}

/**
 * Exporta as solicitações de UM usuário, filtradas por período (opcional).
 * Datas em branco = todos os períodos.
 */
function exportarMinhasSolicitacoesXlsx(email, dataInicioBR, dataFimBR) {
  var lista = buscarMinhasSolicitacoes(email);
  var filtrarPeriodo = !!(dataInicioBR && dataFimBR);
  var dataInicio = filtrarPeriodo ? parseDataBR(dataInicioBR) : null;
  var dataFim = filtrarPeriodo ? parseDataBR(dataFimBR) : null;

  var cabecalho = ["ID", "Data Solicitação", "Data Viagem", "Hora Saída", "Hora Retorno", "Origem", "Destino", "Justificativa", "Status", "Condutor"];
  var linhas = [cabecalho];

  lista.forEach(function (item) {
    if (filtrarPeriodo) {
      var dObj = parseDataBR(item.dataViagem);
      if (!dObj || dObj < dataInicio || dObj > dataFim) return;
    }
    linhas.push([item.id, item.dataSolicitacao, item.dataViagem, item.horaSaida, item.horaRetorno,
                 item.origem, item.destino, item.justificativa, item.status, item.condutorIdaCodigo || ""]);
  });

  return gerarXlsxDeMatriz(linhas, "MarkCarro_MinhasSolicitacoes_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "ddMMyyyy") + ".xlsx");
}

/** Função genérica: transforma uma matriz de valores num arquivo .xlsx (base64). */
function gerarXlsxDeMatriz(matriz, nomeArquivo) {
  var novaSS = SpreadsheetApp.create("MarkCarro_Export_Temp_" + new Date().getTime());
  var novaAba = novaSS.getSheets()[0];
  if (matriz.length > 0) {
    novaAba.getRange(1, 1, matriz.length, matriz[0].length).setValues(matriz);
  }
  SpreadsheetApp.flush();

  var url = "https://docs.google.com/spreadsheets/d/" + novaSS.getId() + "/export?format=xlsx";
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token } });
  var blob = response.getBlob();

  DriveApp.getFileById(novaSS.getId()).setTrashed(true); // limpa a planilha temporária

  return {
    base64: Utilities.base64Encode(blob.getBytes()),
    filename: nomeArquivo
  };
}
