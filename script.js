
const form = document.querySelector("#form-conversao");
const campoValor = document.querySelector("#valor");
const campoDirecao = document.querySelector("#direcao");
const areaResultado = document.querySelector("#resultado");
const botaoConverter = document.querySelector("#botao-converter");

const CHAVE_COTACAO = "converteasy_ultima_cotacao";
const URL_API = "https://economia.awesomeapi.com.br/json/last/USD-BRL";

function exibirMensagem(mensagem) {
  areaResultado.textContent = mensagem;
}

function formatarMoeda(valor, moeda) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda
  }).format(valor);
}

function obterCotacaoSalva() {
  try {
    const dados = localStorage.getItem(CHAVE_COTACAO);
    return dados ? JSON.parse(dados) : null;
  } catch {
    return null;
  }
}

function salvarCotacao(cotacao) {
  try {
    localStorage.setItem(CHAVE_COTACAO, JSON.stringify(cotacao));
  } catch {
    // A conversão continua funcionando mesmo se não for possível salvar.
  }
}

async function buscarCotacao() {
  const resposta = await fetch(URL_API);

  if (!resposta.ok) {
    throw new Error("Não foi possível consultar a cotação.");
  }

  const dados = await resposta.json();
  const dolar = dados.USDBRL;
  const taxa = Number(dolar?.bid);

  if (!Number.isFinite(taxa) || taxa <= 0) {
    throw new Error("A API retornou uma cotação inválida.");
  }

  const cotacao = {
    taxa,
    data: dolar.create_date,
    atualizada: new Date().toISOString()
  };

  salvarCotacao(cotacao);
  return cotacao;
}

function exibirResultado(valor, direcao, cotacao, offline) {
  let convertido;
  let mensagem;

  if (direcao === "BRL-USD") {
    convertido = valor / cotacao.taxa;
    mensagem =
      `${formatarMoeda(valor, "BRL")} equivalem a ` +
      `${formatarMoeda(convertido, "USD")}.`;
  } else {
    convertido = valor * cotacao.taxa;
    mensagem =
      `${formatarMoeda(valor, "USD")} equivalem a ` +
      `${formatarMoeda(convertido, "BRL")}.`;
  }

  const resultado = document.createElement("p");
  resultado.textContent = mensagem;

  const detalhe = document.createElement("p");
  detalhe.textContent =
    `Cotação utilizada: 1 USD = ${formatarMoeda(cotacao.taxa, "BRL")}.`;

  const data = document.createElement("p");
  data.textContent = `Data da cotação: ${cotacao.data || "não informada"}.`;

  const aviso = document.createElement("p");
  aviso.textContent = offline
    ? "Aviso: sem conexão com a API. Foi utilizada a última cotação salva, que pode estar desatualizada."
    : "Cotação consultada com sucesso.";

  areaResultado.replaceChildren(resultado, detalhe, data, aviso);
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const valor = Number(campoValor.value);
  const direcao = campoDirecao.value;

  if (campoValor.value.trim() === "" || !Number.isFinite(valor) || valor <= 0) {
    exibirMensagem("Digite um valor válido maior que zero.");
    campoValor.focus();
    return;
  }

  botaoConverter.disabled = true;
  botaoConverter.textContent = "Consultando...";
  exibirMensagem("Buscando a cotação atual do dólar...");

  try {
    let cotacao;
    let offline = false;

    try {
      cotacao = await buscarCotacao();
    } catch {
      cotacao = obterCotacaoSalva();

      if (!cotacao || !Number.isFinite(Number(cotacao.taxa)) ||
          Number(cotacao.taxa) <= 0) {
        exibirMensagem(
          "Não foi possível consultar a cotação e não há uma cotação salva. Tente novamente com internet."
        );
        return;
      }

      offline = true;
    }

    exibirResultado(valor, direcao, cotacao, offline);
  } finally {
    botaoConverter.disabled = false;
    botaoConverter.textContent = "Converter";
  }
});
