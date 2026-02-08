import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { getProdutividades } from "../data/store";
import type { Produtividade } from "../types";

/** =========================
 *  CUSTO DOS ERROS (R$) -> DESCONTO EM MOEDAS (por colaborador)
 *  ========================= */
const KEY_CUSTO_ERROS = "prodscore_custo_erros";

type ErroItem = {
  data: string;
  colaborador: string;
  quantidade: number;
  custo_unitario: number;
};

function triFromISO(dateISO: string): string {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}T${q}`;
}

function getMapaCustoErrosTri(tri: string): { totalReais: number; porColaborador: Record<string, number> } {
  try {
    const raw = localStorage.getItem(KEY_CUSTO_ERROS);
    const arr = raw ? (JSON.parse(raw) as ErroItem[]) : [];
    if (!Array.isArray(arr)) return { totalReais: 0, porColaborador: {} };

    const porColaborador: Record<string, number> = {};
    let totalReais = 0;

    arr
      .filter((e) => e?.data && triFromISO(String(e.data)) === tri)
      .forEach((e) => {
        const nome = String(e.colaborador ?? "").trim() || "—";
        const qtd = Number(e.quantidade) || 0;
        const custo = Number(e.custo_unitario) || 0;
        const total = qtd * custo;

        totalReais += total;
        porColaborador[nome] = (porColaborador[nome] || 0) + total;
      });

    return { totalReais, porColaborador };
  } catch {
    return { totalReais: 0, porColaborador: {} };
  }
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** =========================
 *  SCORE / MOEDAS
 *  - Mesma regra do Ranking/Dashboard:
 *    itens*1 + pedidos*2 - erros*60 (mínimo 0)
 *  ========================= */
function calcScore(p: Produtividade) {
  const pontosItens = p.itens * 1;
  const pontosPedidos = p.pedidos * 2;
  const penalidade = p.erros * 60;

  const bruto = pontosItens + pontosPedidos;
  const final = Math.max(0, bruto - penalidade);

  return { bruto, final, penalidade };
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function Card(props: { title: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ opacity: 0.75, fontSize: 12 }}>{props.title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
        {props.value}
      </div>
      {props.hint ? (
        <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
          {props.hint}
        </div>
      ) : null}
    </div>
  );
}

function currentTri(): string {
  const iso = new Date().toISOString().slice(0, 10);
  return triFromISO(iso);
}

export default function Carteira() {
  const all = getProdutividades();
  const [tri, setTri] = useState<string>(currentTri());
  const [query, setQuery] = useState<string>("");

  const trimestres = useMemo(() => {
    const tris = new Set(all.map((p) => triFromISO(p.data)));
    tris.add(currentTri());
    return Array.from(tris).sort().reverse();
  }, [all]);

  const triSelecionado = tri || trimestres[0] || currentTri();

  // Filtra produtividade do trimestre selecionado
  const dadosTri = useMemo(() => {
    const base = all.filter((p) => triFromISO(p.data) === triSelecionado);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => String((p as any).colaborador ?? "").toLowerCase().includes(q));
  }, [all, triSelecionado, query]);

  // Agrupa por colaborador
  const porColaborador = useMemo(() => {
    const map = new Map<
      string,
      { itens: number; pedidos: number; erros: number; minutos: number; score: number }
    >();

    dadosTri.forEach((p) => {
      const nome = String((p as any).colaborador ?? "—").trim() || "—";
      const cur = map.get(nome) ?? { itens: 0, pedidos: 0, erros: 0, minutos: 0, score: 0 };
      cur.itens += Number(p.itens) || 0;
      cur.pedidos += Number(p.pedidos) || 0;
      cur.erros += Number(p.erros) || 0;
      cur.minutos += Number(p.minutos) || 0;
      cur.score += calcScore(p).final; // soma score final dos registros
      map.set(nome, cur);
    });

    const arr = Array.from(map.entries()).map(([nome, v]) => ({ nome, ...v }));
    arr.sort((a, b) => b.score - a.score);
    return arr;
  }, [dadosTri]);

  // Total do time
  const totalScore = useMemo(() => sum(porColaborador.map((c) => c.score)), [porColaborador]);

  // ✅ desconto baseado em custo (R$ -> moedas) por colaborador
  const taxaMoedaPorReal = 1; // 1 moeda = R$ 1
  const custoMapa = getMapaCustoErrosTri(triSelecionado);
  const descontoMoedasTotal = custoMapa.totalReais * taxaMoedaPorReal;

  const saldoOriginal = totalScore;
  const saldoAjustado = Math.max(0, saldoOriginal - descontoMoedasTotal);

  const carteiraFinal = useMemo(() => {
    // desconto direto no colaborador do erro
    return porColaborador.map((c) => {
      const custoReaisColab = custoMapa.porColaborador[c.nome] || 0;
      const desconto = custoReaisColab * taxaMoedaPorReal;
      const saldo_final = Math.max(0, c.score - desconto);

      return {
        ...c,
        desconto,
        saldo_final,
        custoReaisColab,
      };
    });
  }, [porColaborador, custoMapa, taxaMoedaPorReal]);

  // Top desconto
  const topDesconto = useMemo(() => {
    const arr = [...carteiraFinal].sort((a, b) => b.desconto - a.desconto);
    return arr[0]?.desconto > 0 ? arr[0] : null;
  }, [carteiraFinal]);

  return (
    <div>
      <PageHeader
        title="Carteira"
        subtitle={`Moedas por produtividade (score) com desconto por custo de erros (somente no responsável) — ${triSelecionado}`}
      />

      {/* Controles */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ opacity: 0.8, fontSize: 13 }}>Trimestre:</div>
        <select value={triSelecionado} onChange={(e) => setTri(e.target.value)} style={selectStyle}>
          {trimestres.map((t) => (
            <option key={t} value={t} style={{ color: "black" }}>
              {t}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por colaborador..."
          style={{ ...inputStyle, minWidth: 240 }}
        />
      </div>

      {/* Cards */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card
          title="Saldo Original (moedas)"
          value={saldoOriginal.toFixed(0)}
          hint="Soma do score final do trimestre"
        />
        <Card
          title="Desconto por custo (moedas)"
          value={descontoMoedasTotal.toFixed(0)}
          hint={`Baseado em ${money(custoMapa.totalReais)} (1 moeda = R$ 1)`}
        />
        <Card
          title="Saldo Ajustado (moedas)"
          value={saldoAjustado.toFixed(0)}
          hint="Saldo original - desconto (mínimo 0)"
        />
      </div>

      {descontoMoedasTotal > 0 ? (
        <div
          style={{
            marginTop: 12,
            background: "rgba(255, 200, 0, 0.10)",
            border: "1px solid rgba(255, 200, 0, 0.25)",
            borderRadius: 16,
            padding: 12,
            opacity: 0.95,
          }}
        >
          <b>Regra B ativa:</b> o desconto é aplicado somente ao colaborador responsável pelo erro com custo.
          {topDesconto ? (
            <>
              {" "}
              Maior desconto: <b>{topDesconto.nome}</b> ({topDesconto.desconto.toFixed(0)} moedas).
            </>
          ) : null}
        </div>
      ) : null}

      {/* Tabela */}
      <div
        style={{
          marginTop: 12,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 14,
          overflowX: "auto",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          Carteira por colaborador ({carteiraFinal.length})
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Colaborador</th>
              <th style={th}>Score (moedas)</th>
              <th style={th}>Custo (R$)</th>
              <th style={th}>Desconto (moedas)</th>
              <th style={th}>Saldo final</th>
              <th style={th}>Itens</th>
              <th style={th}>Pedidos</th>
              <th style={th}>Erros</th>
              <th style={th}>Min</th>
            </tr>
          </thead>
          <tbody>
            {carteiraFinal.map((c) => (
              <tr key={c.nome} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={td}>
                  <b>{c.nome}</b>
                </td>
                <td style={td}>{c.score.toFixed(0)}</td>
                <td style={td}>{money(c.custoReaisColab || 0)}</td>
                <td style={td}>{c.desconto.toFixed(0)}</td>
                <td style={td}>
                  <b>{c.saldo_final.toFixed(0)}</b>
                </td>
                <td style={td}>{c.itens}</td>
                <td style={td}>{c.pedidos}</td>
                <td style={td}>{c.erros}</td>
                <td style={td}>{c.minutos}</td>
              </tr>
            ))}

            {carteiraFinal.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Sem dados no trimestre selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          Observação: o desconto é calculado por registro em <b>/custo-erros</b> e aplicado direto ao colaborador.
        </div>
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "white",
  padding: "10px 12px",
  borderRadius: 12,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  minWidth: 120,
};

const th: React.CSSProperties = { padding: "8px 6px" };
const td: React.CSSProperties = { padding: "8px 6px" };
