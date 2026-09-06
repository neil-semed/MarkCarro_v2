/**
 * ============================================================
 * MARKCARRO - SISTEMA DE GESTÃO DE TRANSPORTES - SEMED NOVA LIMA
 * CODE.GS - PARTE 1 de 3
 * Cobre: Login, Cadastro, Tabelas de Apoio, Nova Solicitação,
 *        Minhas Solicitações, Lista de Condutores
 * ============================================================
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('MarkCarro - SEMED Nova Lima')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function obterSaudacao(nome) {
  var hora = new Date().getHours();
  var saudacao = "Boa noite";
  if (hora >= 5 && hora < 12) saudacao = "Bom dia";
  else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
  return saudacao + ", " + nome + "!";
}

// ============================================================
// MAPA DE COLUNAS - facilita manutenção futura.
// Se um dia adicionar/mudar coluna na planilha, só mexe aqui.
// ============================================================

var COLUNAS_USUARIOS = {
  TIPO: 0, NOME: 1, EMAIL: 2, SENHA: 3, TELEFONE: 4, UNIDADE: 5, SETOR: 6,
  PLACA: 7, MODELO: 8, CAPACIDADE: 9, CATEGORIA: 10, CNH: 11, VALIDADE_CNH: 12,
  ATIVO: 13, VER_AGENDA_GERAL: 14
};

var COLUNAS_SOLICITACOES = {
  ID: 0, EMAIL_SOLICITANTE: 1, DATA_SOLICITACAO: 2, DATA_VIAGEM: 3, HORA_SAIDA: 4,
  HORA_RETORNO: 5, ORIGEM: 6, DESTINO: 7, UNIDADE: 8, SETOR: 9, JUSTIFICATIVA: 10,
  TIPO_VIAGEM: 11, QTD: 12, STATUS: 13, CONDUTOR_IDA: 14, CONDUTOR_VOLTA: 15,
  DATA_CANC_CONF: 16, NOME_SOLICITANTE_EXTERNO: 17, TELEFONE_SOLICITANTE_EXTERNO: 18
};

// ============================================================
// UTILITÁRIOS - normalização de data/hora
// O Google Sheets às vezes converte texto "24/08/2026" ou "14:30"
// automaticamente para células de Data/Hora reais. Essas funções
// tratam os dois casos (texto puro OU objeto Date do Sheets),
// sempre devolvendo texto no formato esperado pela tela.
// ============================================================

function formatarDataBR(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  return valor.toString();
}

function formatarHoraBR(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "HH:mm");
  }
  return valor.toString();
}

function formatarDataHoraBR(valor) {
  if (!valor) return "";
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  }
  return valor.toString();
}

/** Busca o Nome de um usuário (solicitante) pelo e-mail, para exibir nas telas. */
function buscarNomeUsuario(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return email || "";

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    var e = data[i][C.EMAIL] ? data[i][C.EMAIL].toString().trim().toLowerCase() : "";
    if (e === emailBusca) return data[i][C.NOME] || email;
  }
  return email || "";
}

// ============================================================
// TABELAS DE APOIO (unidades, setores em cascata, locais)
// ============================================================

function buscarTabelasApoio() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaApoio = ss.getSheetByName("tabelas_apoio");
  var unidades = [];

  if (abaApoio) {
    var dataApoio = abaApoio.getDataRange().getValues();
    for (var i = 1; i < dataApoio.length; i++) {
      var valUnidade = dataApoio[i][0] ? dataApoio[i][0].toString().trim() : "";
      if (valUnidade && unidades.indexOf(valUnidade) === -1) unidades.push(valUnidade);
    }
  }

  var abaLocais = ss.getSheetByName("Locais");
  var locais = [];
  if (abaLocais) {
    var dataLocais = abaLocais.getDataRange().getValues();
    for (var j = 1; j < dataLocais.length; j++) {
      var valLocal = dataLocais[j][0] ? dataLocais[j][0].toString().trim() : "";
      if (valLocal && locais.indexOf(valLocal) === -1) locais.push(valLocal);
    }
  }

  return { unidades: unidades, locais: locais };
}

/**
 * Busca o e-mail cadastrado para um par Unidade+Setor na aba tabelas_apoio
 * (3ª coluna: Email). Usado para mandar notificações ao setor, não à pessoa.
 */
function buscarEmailSetor(unidade, setor) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("tabelas_apoio");
  if (!aba) return "";

  var data = aba.getDataRange().getValues();
  var uBusca = unidade ? unidade.toString().trim().toLowerCase() : "";
  var sBusca = setor ? setor.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    var u = data[i][0] ? data[i][0].toString().trim().toLowerCase() : "";
    var s = data[i][1] ? data[i][1].toString().trim().toLowerCase() : "";
    if (u === uBusca && s === sBusca) {
      return data[i][2] ? data[i][2].toString().trim() : "";
    }
  }
  return "";
}

/**
 * Retorna o e-mail de contato: o do setor, se cadastrado, ou o e-mail
 * de login do solicitante como reserva.
 */
function obterEmailNotificacao(unidade, setor, emailSolicitante) {
  var emailSetor = buscarEmailSetor(unidade, setor);
  return emailSetor || emailSolicitante;
}

/**
 * Retorna só os setores de UMA unidade (usado no dropdown em cascata:
 * o usuário escolhe a Unidade primeiro, e o front chama esta função
 * para preencher o Setor com base na escolha).
 */
function buscarSetoresPorUnidade(unidade) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("tabelas_apoio");
  var setores = [];
  if (!aba) return setores;

  var data = aba.getDataRange().getValues();
  var unidadeBusca = unidade ? unidade.toString().trim() : "";

  for (var i = 1; i < data.length; i++) {
    var valUnidade = data[i][0] ? data[i][0].toString().trim() : "";
    var valSetor = data[i][1] ? data[i][1].toString().trim() : "";
    if (valUnidade === unidadeBusca && valSetor && setores.indexOf(valSetor) === -1) {
      setores.push(valSetor);
    }
  }
  return setores;
}

// ============================================================
// LOGIN E CADASTRO
// ============================================================

function autenticarUsuario(email, senha) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return { existe: false };

  var data = aba.getDataRange().getValues();
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";
  var C = COLUNAS_USUARIOS;

  for (var i = 1; i < data.length; i++) {
    var emailPlanilha = data[i][C.EMAIL] ? data[i][C.EMAIL].toString().trim().toLowerCase() : "";
    if (emailPlanilha !== emailBusca) continue;

    var senhaPlanilha = data[i][C.SENHA] ? data[i][C.SENHA].toString().trim() : "";
    if (senhaPlanilha !== senha) {
      return { existe: true, autenticado: false, mensagem: "Senha incorreta. Tente novamente." };
    }

    var ativo = data[i][C.ATIVO] ? data[i][C.ATIVO].toString().trim().toLowerCase() : "sim";
    if (ativo === "não" || ativo === "nao") {
      return { existe: true, autenticado: false, mensagem: "Seu acesso está bloqueado. Entre em contato com o gestor." };
    }

    return {
      existe: true,
      autenticado: true,
      usuario: {
        tipo: data[i][C.TIPO],
        nome: data[i][C.NOME],
        email: data[i][C.EMAIL],
        telefone: data[i][C.TELEFONE],
        unidade: data[i][C.UNIDADE],
        setor: data[i][C.SETOR],
        placa: data[i][C.PLACA],
        modelo: data[i][C.MODELO],
        capacidade: data[i][C.CAPACIDADE],
        categoria: data[i][C.CATEGORIA],
        cnh: data[i][C.CNH],
        validadeCnh: formatarDataBR(data[i][C.VALIDADE_CNH]),
        verAgendaGeral: (data[i][C.VER_AGENDA_GERAL] ? data[i][C.VER_AGENDA_GERAL].toString().trim().toLowerCase() : "não") === "sim"
      }
    };
  }
  return { existe: false };
}

function salvarUsuario(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");

  if (aba.getLastRow() === 0) {
    aba.appendRow(["Tipo","Nome","Email","Senha","Telefone","Unidade","Setor",
                    "Placa","Modelo","Capacidade","Categoria","CNH","ValidadeCNH","Ativo","VerAgendaGeral"]);
  }

  var data = aba.getDataRange().getValues();
  var rowIndex = -1;
  var emailBusca = dados.email.toString().trim().toLowerCase();
  var C = COLUNAS_USUARIOS;
  var ativoAtual = "Sim";
  var verAgendaAtual = "Não";

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.EMAIL] && data[i][C.EMAIL].toString().trim().toLowerCase() === emailBusca) {
      rowIndex = i + 1;
      ativoAtual = data[i][C.ATIVO] || "Sim";
      verAgendaAtual = data[i][C.VER_AGENDA_GERAL] || "Não";
      break;
    }
  }

  var linha = [
    dados.tipo, dados.nome, dados.email, dados.senha, dados.telefone,
    dados.unidade || "", dados.setor || "", dados.placa || "", dados.modelo || "",
    dados.capacidade || "", dados.categoria || "", dados.cnh || "", dados.validadeCnh || "",
    ativoAtual, verAgendaAtual
  ];

  if (rowIndex > 0) {
    aba.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    aba.appendRow(linha);
  }

  return { sucesso: true, mensagem: "Cadastro realizado com sucesso!" };
}

// ============================================================
// CONDUTORES (usado no dropdown "Atribuir Condutor" do Gestor)
// ============================================================

/**
 * @param {string} [categoria] "Motorista" ou "Motoboy" - opcional.
 * Se informado, filtra só os condutores daquela categoria.
 */
function buscarListaCondutores(categoria) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var condutores = [];
  var C = COLUNAS_USUARIOS;
  var categoriaBusca = categoria ? categoria.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    var tipo = data[i][C.TIPO] ? data[i][C.TIPO].toString().trim().toLowerCase() : "";
    if (tipo !== "condutor") continue;

    var cat = data[i][C.CATEGORIA] ? data[i][C.CATEGORIA].toString().trim().toLowerCase() : "";
    if (categoriaBusca && cat !== categoriaBusca) continue;

    var nome = data[i][C.NOME] ? data[i][C.NOME].toString().trim() : "";
    var capacidade = data[i][C.CAPACIDADE] ? data[i][C.CAPACIDADE].toString().trim() : "";
    var codigo = capacidade ? (nome + " " + capacidade) : nome;

    condutores.push({
      nome: nome,
      email: data[i][C.EMAIL],
      codigo: codigo,           // ex: "Cristiano 15L" - é isso que aparece nas telas
      categoria: data[i][C.CATEGORIA],
      telefone: data[i][C.TELEFONE],
      placa: data[i][C.PLACA],
      modelo: data[i][C.MODELO]
    });
  }
  return condutores;
}

/** Busca os dados de UM condutor pelo e-mail (usado para montar notificações). */
function buscarDadosCondutor(emailCondutor) {
  var lista = buscarListaCondutores();
  var emailBusca = emailCondutor ? emailCondutor.toString().trim().toLowerCase() : "";
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].email && lista[i].email.toString().trim().toLowerCase() === emailBusca) {
      return lista[i];
    }
  }
  return null;
}

// ============================================================
// NOVA SOLICITAÇÃO
// ============================================================

function registrarSolicitacao(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  if (!aba) throw new Error("Aba 'Solicitacoes' não encontrada. Confira a Etapa 1.");

  if (aba.getLastRow() === 0) {
    aba.appendRow([
      "ID","EmailSolicitante","DataSolicitacao","DataViagem","HoraSaida","HoraRetorno",
      "Origem","Destino","Unidade","Setor","Justificativa","TipoViagem","Qtd","Status",
      "CondutorIda","CondutorVolta","DataCancelamentoConfirmacao","NomeSolicitanteExterno","TelefoneSolicitanteExterno"
    ]);
  }

  var id = "SOL-" + new Date().getTime();
  var hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  aba.appendRow([
    id,
    dados.emailSolicitante,
    hoje,
    dados.dataViagem,
    dados.horaSaida,
    dados.horaRetorno,
    dados.origem,      // já deve vir com o texto digitado, se "Outro Local"
    dados.destino,     // idem
    dados.unidade || "",
    dados.setor || "",
    dados.justificativa || "",
    dados.tipoViagem,
    dados.qtd,
    "Pendente",
    "", "", "",
    dados.nomeSolicitanteExterno || "",
    dados.telefoneSolicitanteExterno || ""
  ]);

  // Notificação de recebimento - vai para o e-mail do SETOR (ou do
  // solicitante, se o setor ainda não tiver e-mail cadastrado).
  try {
    var nomeSolicitante = dados.nomeSolicitanteExterno || buscarNomeUsuario(dados.emailSolicitante);
    var emailDestino = obterEmailNotificacao(dados.unidade, dados.setor, dados.emailSolicitante);
    var mensagemRecebimento =
      "Prezada(o) " + nomeSolicitante + ",\n\n" +
      "Informamos que recebemos seu agendamento de transporte para a(o) " + dados.destino +
      " em " + dados.dataViagem + ", para " + dados.qtd + " pessoa(s).\n\n" +
      "Aguarde a nossa resposta. Sua solicitação será analisada e poderá ser ajustada conforme " +
      "nosso planejamento e disponibilidade de frota.\n\n" +
      "Informamos que os veículos disponibilizados poderão ser compartilhados entre diferentes solicitações.\n\n" +
      "Caso necessite cancelar ou alterar esta solicitação, entre em contato com o setor de Transporte.";

    var rodape = "\n\nTransporte - SEMED.\n\n(Essa mensagem foi gerada automaticamente)";
    var agoraRecebimento = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    enviarNotificacao(emailDestino, "recebimento", "Status: Pendente — " + agoraRecebimento, true,
      "[MarkCarro] Recebemos seu agendamento de transporte", mensagemRecebimento + rodape);
  } catch (e) {
    Logger.log("Erro ao notificar recebimento: " + e);
  }

  return { sucesso: true, mensagem: "Solicitação gerada com sucesso!", id: id };
}

/**
 * Verifica se ainda dá tempo do SOLICITANTE cancelar (até 30 min antes da saída).
 */
function podeCancelarSolicitacao(dataViagemBR, horaSaidaBR) {
  if (!dataViagemBR || !horaSaidaBR) return false;

  var partesData = dataViagemBR.split("/");
  if (partesData.length !== 3) return false;
  var partesHora = horaSaidaBR.split(":");
  if (partesHora.length !== 2) return false;

  var dataHoraSaida = new Date(
    Number(partesData[2]), Number(partesData[1]) - 1, Number(partesData[0]),
    Number(partesHora[0]), Number(partesHora[1]), 0, 0
  );

  var limiteCancelamento = new Date(dataHoraSaida.getTime() - 30 * 60 * 1000); // 30 min antes
  return new Date() < limiteCancelamento;
}

var STATUS_FINAIS = ["Cancelada", "Ocupado", "Desprezado"];

/**
 * O próprio SOLICITANTE cancela a viagem (status vira "Desprezado").
 * Só permitido até 30 min antes do horário de saída. Sem pedir motivo.
 * Avisa todos os gestores pelo sino (sem e-mail).
 */
function cancelarSolicitacaoPeloSolicitante(idSolicitacao, emailSolicitante) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  if (!aba) return { sucesso: false, mensagem: "Aba Solicitacoes não encontrada." };

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_SOLICITACOES;
  var emailBusca = emailSolicitante ? emailSolicitante.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.ID].toString().trim() !== idSolicitacao.toString().trim()) continue;

    var emailLinha = data[i][C.EMAIL_SOLICITANTE] ? data[i][C.EMAIL_SOLICITANTE].toString().trim().toLowerCase() : "";
    if (emailLinha !== emailBusca) {
      return { sucesso: false, mensagem: "Você não tem permissão para cancelar esta solicitação." };
    }

    var statusAtual = data[i][C.STATUS] || "Pendente";
    if (STATUS_FINAIS.indexOf(statusAtual) !== -1) {
      return { sucesso: false, mensagem: "Esta solicitação já está com status '" + statusAtual + "' e não pode mais ser cancelada." };
    }

    var dataViagemBR = formatarDataBR(data[i][C.DATA_VIAGEM]);
    var horaSaidaBR = formatarHoraBR(data[i][C.HORA_SAIDA]);

    if (!podeCancelarSolicitacao(dataViagemBR, horaSaidaBR)) {
      return { sucesso: false, mensagem: "Não é mais possível cancelar: faltam menos de 30 minutos para o horário de saída (ou a viagem já passou)." };
    }

    var linha = i + 1;
    aba.getRange(linha, C.STATUS + 1).setValue("Desprezado");
    aba.getRange(linha, C.DATA_CANC_CONF + 1).setValue(
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));

    var nomeSolicitante = buscarNomeUsuario(emailSolicitante);
    var destinoViagem = data[i][C.DESTINO];
    notificarTodosGestores(
      nomeSolicitante + " cancelou a própria solicitação para " + destinoViagem +
      " (" + dataViagemBR + " às " + horaSaidaBR + ")."
    );

    return { sucesso: true, mensagem: "Solicitação cancelada com sucesso." };
  }

  return { sucesso: false, mensagem: "Solicitação não encontrada." };
}

// ============================================================
// GESTÃO DE CONDUTORES PELO GESTOR (cadastrar/editar)
// ============================================================

/** Lista completa de condutores (todos os campos), para a tela de gestão. */
function listarCondutoresCompleto() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    var tipo = data[i][C.TIPO] ? data[i][C.TIPO].toString().trim().toLowerCase() : "";
    if (tipo !== "condutor") continue;

    resultado.push({
      email: data[i][C.EMAIL],
      nome: data[i][C.NOME],
      telefone: data[i][C.TELEFONE],
      placa: data[i][C.PLACA],
      modelo: data[i][C.MODELO],
      capacidade: data[i][C.CAPACIDADE],
      categoria: data[i][C.CATEGORIA],
      cnh: data[i][C.CNH],
      validadeCnh: formatarDataBR(data[i][C.VALIDADE_CNH]),
      ativo: (data[i][C.ATIVO] ? data[i][C.ATIVO].toString().trim().toLowerCase() : "sim") !== "não" &&
             (data[i][C.ATIVO] ? data[i][C.ATIVO].toString().trim().toLowerCase() : "sim") !== "nao",
      verAgendaGeral: (data[i][C.VER_AGENDA_GERAL] ? data[i][C.VER_AGENDA_GERAL].toString().trim().toLowerCase() : "não") === "sim"
    });
  }
  return resultado;
}

/** Permite (ou revoga) o acesso de um condutor à Agenda Geral (ver a escala de todos). */
function alternarVerAgendaGeral(email, permitir) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return { sucesso: false, mensagem: "Aba Usuarios não encontrada." };

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.EMAIL] && data[i][C.EMAIL].toString().trim().toLowerCase() === emailBusca) {
      aba.getRange(i + 1, C.VER_AGENDA_GERAL + 1).setValue(permitir ? "Sim" : "Não");
      return { sucesso: true, mensagem: permitir ? "Agenda Geral liberada!" : "Agenda Geral bloqueada!" };
    }
  }
  return { sucesso: false, mensagem: "Condutor não encontrado." };
}

/** Ativa ou bloqueia o acesso de um usuário (condutor, solicitante ou gestor) pelo e-mail. */
function alternarAtivoUsuario(email, ativar) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return { sucesso: false, mensagem: "Aba Usuarios não encontrada." };

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.EMAIL] && data[i][C.EMAIL].toString().trim().toLowerCase() === emailBusca) {
      aba.getRange(i + 1, C.ATIVO + 1).setValue(ativar ? "Sim" : "Não");
      return { sucesso: true, mensagem: ativar ? "Acesso liberado!" : "Acesso bloqueado!" };
    }
  }
  return { sucesso: false, mensagem: "Usuário não encontrado." };
}

/** Cria ou atualiza um condutor, direto pelo Painel do Gestor.
 * Se o e-mail já existir, atualiza; senão, cria. Senha em branco numa
 * edição mantém a senha atual (não obriga redefinir toda vez).
 */
function salvarCondutorPeloGestor(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");

  if (aba.getLastRow() === 0) {
    aba.appendRow(["Tipo","Nome","Email","Senha","Telefone","Unidade","Setor",
                    "Placa","Modelo","Capacidade","Categoria","CNH","ValidadeCNH","Ativo","VerAgendaGeral"]);
  }

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = dados.email ? dados.email.toString().trim().toLowerCase() : "";
  var rowIndex = -1;
  var senhaAtual = "";
  var ativoAtual = "Sim";
  var verAgendaAtual = "Não";

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.EMAIL] && data[i][C.EMAIL].toString().trim().toLowerCase() === emailBusca) {
      rowIndex = i + 1;
      senhaAtual = data[i][C.SENHA];
      ativoAtual = data[i][C.ATIVO] || "Sim";
      verAgendaAtual = data[i][C.VER_AGENDA_GERAL] || "Não";
      break;
    }
  }

  if (rowIndex === -1 && !dados.senha) {
    return { sucesso: false, mensagem: "Defina uma senha inicial para o novo condutor." };
  }

  var senhaFinal = dados.senha ? dados.senha : senhaAtual;

  var linha = [
    "condutor", dados.nome, dados.email, senhaFinal, dados.telefone || "",
    "", "", dados.placa || "", dados.modelo || "", dados.capacidade || "",
    dados.categoria || "", dados.cnh || "", dados.validadeCnh || "", ativoAtual, verAgendaAtual
  ];

  if (rowIndex > 0) {
    aba.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    aba.appendRow(linha);
  }

  return { sucesso: true, mensagem: rowIndex > 0 ? "Condutor atualizado!" : "Condutor cadastrado!" };
}

/**
 * Retorna condutores com CNH vencida ou vencendo dentro de N dias.
 * diasRestantes negativo = já venceu.
 */
function buscarAvisosCnh(diasAntecedencia) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  var limite = diasAntecedencia || 30;
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    var tipo = data[i][C.TIPO] ? data[i][C.TIPO].toString().trim().toLowerCase() : "";
    if (tipo !== "condutor") continue;

    var validadeBR = formatarDataBR(data[i][C.VALIDADE_CNH]);
    if (!validadeBR) continue;

    var dataVenc = parseDataBR(validadeBR);
    if (!dataVenc) continue;

    var diasRestantes = Math.round((dataVenc - hoje) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= limite) {
      resultado.push({
        nome: data[i][C.NOME],
        email: data[i][C.EMAIL],
        validadeCnh: validadeBR,
        diasRestantes: diasRestantes,
        vencida: diasRestantes < 0
      });
    }
  }

  resultado.sort(function (a, b) { return a.diasRestantes - b.diasRestantes; });
  return resultado;
}

/** O próprio usuário troca a senha (pede a senha atual pra confirmar). */
function alterarMinhaSenha(email, senhaAtual, senhaNova) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return { sucesso: false, mensagem: "Aba Usuarios não encontrada." };

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = email ? email.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    var e = data[i][C.EMAIL] ? data[i][C.EMAIL].toString().trim().toLowerCase() : "";
    if (e !== emailBusca) continue;

    var senhaPlanilha = data[i][C.SENHA] ? data[i][C.SENHA].toString().trim() : "";
    if (senhaPlanilha !== senhaAtual) {
      return { sucesso: false, mensagem: "Senha atual incorreta." };
    }

    aba.getRange(i + 1, C.SENHA + 1).setValue(senhaNova);
    return { sucesso: true, mensagem: "Senha alterada com sucesso!" };
  }
  return { sucesso: false, mensagem: "Usuário não encontrado." };
}

// ============================================================
// GESTÃO DE USUÁRIOS/SOLICITANTES PELO GESTOR
// ============================================================

function listarSolicitantesCompleto() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var resultado = [];

  for (var i = 1; i < data.length; i++) {
    var tipo = data[i][C.TIPO] ? data[i][C.TIPO].toString().trim().toLowerCase() : "";
    if (tipo !== "solicitante") continue;

    resultado.push({
      email: data[i][C.EMAIL],
      nome: data[i][C.NOME],
      telefone: data[i][C.TELEFONE],
      unidade: data[i][C.UNIDADE],
      setor: data[i][C.SETOR],
      ativo: (data[i][C.ATIVO] ? data[i][C.ATIVO].toString().trim().toLowerCase() : "sim") !== "não" &&
             (data[i][C.ATIVO] ? data[i][C.ATIVO].toString().trim().toLowerCase() : "sim") !== "nao"
    });
  }
  return resultado;
}

/** Cria ou atualiza um solicitante, direto pelo Painel do Gestor. */
function salvarUsuarioPeloGestor(dados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");

  if (aba.getLastRow() === 0) {
    aba.appendRow(["Tipo","Nome","Email","Senha","Telefone","Unidade","Setor",
                    "Placa","Modelo","Capacidade","Categoria","CNH","ValidadeCNH","Ativo","VerAgendaGeral"]);
  }

  var data = aba.getDataRange().getValues();
  var C = COLUNAS_USUARIOS;
  var emailBusca = dados.email ? dados.email.toString().trim().toLowerCase() : "";
  var rowIndex = -1;
  var senhaAtual = "";
  var ativoAtual = "Sim";
  var verAgendaAtual = "Não";

  for (var i = 1; i < data.length; i++) {
    if (data[i][C.EMAIL] && data[i][C.EMAIL].toString().trim().toLowerCase() === emailBusca) {
      rowIndex = i + 1;
      senhaAtual = data[i][C.SENHA];
      ativoAtual = data[i][C.ATIVO] || "Sim";
      verAgendaAtual = data[i][C.VER_AGENDA_GERAL] || "Não";
      break;
    }
  }

  if (rowIndex === -1 && !dados.senha) {
    return { sucesso: false, mensagem: "Defina uma senha inicial para o novo usuário." };
  }

  var senhaFinal = dados.senha ? dados.senha : senhaAtual;

  var linha = [
    "solicitante", dados.nome, dados.email, senhaFinal, dados.telefone || "",
    dados.unidade || "", dados.setor || "", "", "", "", "", "", "", ativoAtual, verAgendaAtual
  ];

  if (rowIndex > 0) {
    aba.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  } else {
    aba.appendRow(linha);
  }

  return { sucesso: true, mensagem: rowIndex > 0 ? "Usuário atualizado!" : "Usuário cadastrado!" };
}

// ============================================================
// MINHAS SOLICITAÇÕES
// ============================================================

function buscarMinhasSolicitacoes(emailSolicitante) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName("Solicitacoes");
  if (!aba) return [];

  var data = aba.getDataRange().getValues();
  var resultado = [];
  var C = COLUNAS_SOLICITACOES;
  var emailBusca = emailSolicitante ? emailSolicitante.toString().trim().toLowerCase() : "";

  for (var i = 1; i < data.length; i++) {
    var emailLinha = data[i][C.EMAIL_SOLICITANTE] ? data[i][C.EMAIL_SOLICITANTE].toString().trim().toLowerCase() : "";
    if (emailLinha !== emailBusca) continue;

    var statusLinha = data[i][C.STATUS] || "Pendente";
    var dataViagemBR = formatarDataBR(data[i][C.DATA_VIAGEM]);
    var horaSaidaBR = formatarHoraBR(data[i][C.HORA_SAIDA]);
    var podeCancelar = STATUS_FINAIS.indexOf(statusLinha) === -1 && podeCancelarSolicitacao(dataViagemBR, horaSaidaBR);

    resultado.push({
      id: data[i][C.ID],
      dataSolicitacao: formatarDataBR(data[i][C.DATA_SOLICITACAO]),
      dataViagem: dataViagemBR,
      horaSaida: horaSaidaBR,
      horaRetorno: formatarHoraBR(data[i][C.HORA_RETORNO]),
      origem: data[i][C.ORIGEM],
      destino: data[i][C.DESTINO],
      justificativa: data[i][C.JUSTIFICATIVA],
      tipoViagem: data[i][C.TIPO_VIAGEM],
      qtd: data[i][C.QTD],
      status: statusLinha,
      condutorIdaEmail: data[i][C.CONDUTOR_IDA] || "",
      condutorVoltaEmail: data[i][C.CONDUTOR_VOLTA] || "",
      condutorIdaCodigo: data[i][C.CONDUTOR_IDA] ? obterCodigoCondutor(data[i][C.CONDUTOR_IDA]) : "",
      condutorIdaTelefone: data[i][C.CONDUTOR_IDA] ? (buscarDadosCondutor(data[i][C.CONDUTOR_IDA]) || {}).telefone || "" : "",
      condutorVoltaCodigo: data[i][C.CONDUTOR_VOLTA] ? obterCodigoCondutor(data[i][C.CONDUTOR_VOLTA]) : "",
      condutorVoltaTelefone: data[i][C.CONDUTOR_VOLTA] ? (buscarDadosCondutor(data[i][C.CONDUTOR_VOLTA]) || {}).telefone || "" : "",
      podeCancelar: podeCancelar
    });
  }
  return resultado;
}
