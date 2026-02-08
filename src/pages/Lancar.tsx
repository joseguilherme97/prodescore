import { useState } from "react";
import * as XLSX from "xlsx";
import { addProdutividade, importFromExcel } from "../data/store";
import type { Produtividade } from "../types";

export default function Lancar() {
  const [colaborador, setColaborador] = useState("");
  const [data, setData] = useState("");
  const [pedidos, setPedidos] = useState<number>(0);
  const [itens, setItens] = useState<number>(0);
  const [erros, setErros] = useState<number>(0);
  const [minutos, setMinutos] = useState<number>(0);

  /* =========================
     LANÇAMENTO MANUAL
  ========================= */
  function salvarManual() {
    if (!colaborador || !data) {
      alert("Informe colaborador e data");
      return;
    }

    const item: Produtividade = {
      colaborador: colaborador.trim(),
      data,
      pedidos: Number(pedidos) || 0,
      itens: Number(itens) || 0,
      erros: Number(erros) || 0,
      minutos: Number(minutos) || 0,
    };

    addProdutividade(item);
    alert("Lançamento salvo com sucesso");

    // limpa só os números (mantém colaborador e data para lançar rápido)
    setPedidos(0);
    setItens(0);
    setErros(0);
    setMinutos(0);
  }

  /* =========================
     IMPORTAÇÃO EXCEL
     Aceita cabeçalho:
     data, colaborador, qtd_pedidos, qtd_itens, qtd_erros, minutos
     OU também:
     pedidos, itens, erros
  ========================= */
  function handleExcel(file: File) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(bytes, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Aqui pegamos como OBJETO usando cabeçalho da planilha
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

      // Normaliza nomes de colunas (suporta os dois padrões)
      const normalized = rows.map((r) => ({
        data: r["data"] ?? r["Data"] ?? r["DATA"],
        colaborador: r["colaborador"] ?? r["Colaborador"] ?? r["COLABORADOR"],
        pedidos:
          r["qtd_pedidos"] ??
          r["pedidos"] ??
          r["Pedidos"] ??
          r["QTD_PEDIDOS"],
        itens:
          r["qtd_itens"] ??
          r["itens"] ??
          r["Itens"] ??
          r["QTD_ITENS"],
        erros:
          r["qtd_erros"] ??
          r["erros"] ??
          r["Erros"] ??
          r["QTD_ERROS"],
        minutos: r["minutos"] ?? r["Minutos"] ?? r["MINUTOS"],
      }));

      importFromExcel(normalized);
      alert("Excel importado com sucesso");
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <h2>Lançar Produtividade</h2>
      <p className="muted">
        Manual ou por upload XLSX (atualiza tudo automaticamente). Colunas aceitas:
        <br />
        <strong>data</strong>, <strong>colaborador</strong>, <strong>qtd_pedidos</strong>,{" "}
        <strong>qtd_itens</strong>, <strong>qtd_erros</strong>, <strong>minutos</strong>
        <br />
        (também aceita <strong>pedidos</strong>, <strong>itens</strong>, <strong>erros</strong>).
      </p>

      <div className="pageSection">
        <h3>Lançamento Manual</h3>

        <div className="rowGrid">
          <div>
            <label className="muted">Colaborador</label>
            <input
              className="input"
              placeholder="Ex: João"
              value={colaborador}
              onChange={(e) => setColaborador(e.target.value)}
            />
          </div>

          <div>
            <label className="muted">Data (ISO)</label>
            <input
              className="input"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div>
            <label className="muted">Pedidos</label>
            <input
              className="input"
              type="number"
              value={pedidos}
              onChange={(e) => setPedidos(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="muted">Itens</label>
            <input
              className="input"
              type="number"
              value={itens}
              onChange={(e) => setItens(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="muted">Erros</label>
            <input
              className="input"
              type="number"
              value={erros}
              onChange={(e) => setErros(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="muted">Minutos</label>
            <input
              className="input"
              type="number"
              value={minutos}
              onChange={(e) => setMinutos(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={salvarManual}>
            Salvar lançamento
          </button>
        </div>
      </div>

      <div className="pageSection">
        <h3>Importar por XLSX</h3>

        <input
          className="input"
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleExcel(file);
          }}
        />
      </div>
    </div>
  );
}
