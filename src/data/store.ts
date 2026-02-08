import type { MetaTrimestre, Produtividade } from "../types";

const KEY_PROD = "prodscore_produtividades";
const KEY_META = "prodscore_metas_trimestre";

/* =========================
   HELPERS
========================= */

// pega valor por várias chaves possíveis (case-insensitive)
function pick(row: any, keys: string[]) {
  if (!row) return undefined;

  // tenta direto (caso exatamente igual)
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
  }

  // tenta case-insensitive + trim
  const map: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    map[String(key).trim().toLowerCase()] = row[key];
  }
  for (const k of keys) {
    const v = map[String(k).trim().toLowerCase()];
    if (v !== undefined) return v;
  }

  return undefined;
}

function num(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  // remove moeda, espaços etc.
  const s = String(v)
    .trim()
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace("%", "");

  // se vier tipo "1.234,56" -> "1234.56"
  const normalized =
    s.includes(",") && s.includes(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// converte datas comuns para ISO YYYY-MM-DD
function toISODate(v: any): string {
  if (v === null || v === undefined) return "";

  // Excel serial date (geralmente > 25569)
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel epoch: 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + v * 86400000);
    return isoFromDate(d);
  }

  const s = String(v).trim();
  if (!s) return "";

  // já ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY ou DD-MM-YYYY
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) {
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // tenta parse padrão
  const d = new Date(s);
  if (!isNaN(d.getTime())) return isoFromDate(d);

  return "";
}

function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================
   CRUD PRODUTIVIDADE
========================= */
export function getProdutividades(): Produtividade[] {
  const raw = localStorage.getItem(KEY_PROD);
  return raw ? (JSON.parse(raw) as Produtividade[]) : [];
}

export function addProdutividade(p: Produtividade) {
  const atual = getProdutividades();

  const item: Produtividade = {
    colaborador: String(p.colaborador || "").trim(),
    pedidos: num(p.pedidos),
    itens: num(p.itens),
    erros: num(p.erros),
    minutos: num(p.minutos),
    data: toISODate(p.data),
    custoErro: p.custoErro !== undefined ? num(p.custoErro) : undefined,
    tipoErro: p.tipoErro ? String(p.tipoErro).trim() : undefined,
  };

  // só salva se tiver colaborador e data válida
  if (item.colaborador && item.data) {
    atual.push(item);
    localStorage.setItem(KEY_PROD, JSON.stringify(atual));
  }
}

export function clearProdutividades() {
  localStorage.removeItem(KEY_PROD);
}

/* =========================
   IMPORTAÇÃO EXCEL (PROD)
========================= */
export function importFromExcel(rows: any[]) {
  const atual = getProdutividades();

  rows.forEach((row) => {
    const data = toISODate(
      pick(row, ["data", "date", "dia", "dt", "Data", "DATA"])
    );

    const colaborador = String(
      pick(row, ["colaborador", "funcionario", "nome", "Colaborador", "NOME"]) ??
        ""
    ).trim();

    // aceita colunas antigas e novas
    const pedidos = num(
      pick(row, [
        "pedidos",
        "qtd_pedidos",
        "qtd pedidos",
        "qtdpedidos",
        "Pedidos",
        "QTD_PEDIDOS",
      ])
    );

    const itens = num(
      pick(row, [
        "itens",
        "qtd_itens",
        "qtd itens",
        "qtditens",
        "Itens",
        "QTD_ITENS",
      ])
    );

    const erros = num(
      pick(row, [
        "erros",
        "qtd_erros",
        "qtd erros",
        "qtderros",
        "Erros",
        "QTD_ERROS",
      ])
    );

    const minutos = num(
      pick(row, [
        "minutos",
        "tempo_min",
        "tempo",
        "min",
        "Minutos",
        "TEMPO_MIN",
      ])
    );

    const custoErro = (() => {
      const v = pick(row, ["custoErro", "custo_erro", "custo", "CUSTO_ERRO"]);
      return v === undefined ? undefined : num(v);
    })();

    const tipoErro = (() => {
      const v = pick(row, ["tipoErro", "tipo_erro", "tipo", "TIPO_ERRO"]);
      return v === undefined ? undefined : String(v).trim();
    })();

    const item: Produtividade = {
      data,
      colaborador,
      pedidos,
      itens,
      erros,
      minutos,
      custoErro,
      tipoErro,
    };

    if (item.colaborador && item.data) {
      atual.push(item);
    }
  });

  localStorage.setItem(KEY_PROD, JSON.stringify(atual));
}

/* =========================
   CRUD METAS TRIMESTRAIS
========================= */
export function getMetasTrimestre(): MetaTrimestre[] {
  const raw = localStorage.getItem(KEY_META);
  return raw ? (JSON.parse(raw) as MetaTrimestre[]) : [];
}

export function saveMetaTrimestre(meta: MetaTrimestre) {
  const metas = getMetasTrimestre();

  const clean: MetaTrimestre = {
    trimestre: String(meta.trimestre || "").trim(),
    metaPontos: num(meta.metaPontos),
    metaErrosMax: num(meta.metaErrosMax),
  };

  if (!clean.trimestre) return;

  const idx = metas.findIndex((m) => m.trimestre === clean.trimestre);
  if (idx >= 0) metas[idx] = clean;
  else metas.push(clean);

  localStorage.setItem(KEY_META, JSON.stringify(metas));
}

export function clearMetasTrimestre() {
  localStorage.removeItem(KEY_META);
}
