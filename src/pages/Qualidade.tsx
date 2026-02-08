import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { getProdutividades } from "../data/store";

const KEY_CUSTO_ERROS = "prodscore_custo_erros";

type ErroCustoItem = {
  data: string; // ISO
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

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function pct(n: number) {
  return `${n.toFixed(2)}%`;
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function loadCustoErros(): ErroCustoItem[] {
  try {
    const raw = localStorage.getItem(KEY_CUSTO_ERROS);
    const arr = raw ? (JSON.parse(raw) as ErroCustoItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function Qualidade() {
  const all = getProdutividades();
  const [tri, setTri] = useState<string>("");
  const [colab, setColab] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const trimestres = useMemo(() => {
    const tris = new Set(all.map((p) => triFromISO(p.data)));
    // inclui trimestre atual mesmo sem dados
    const hojeIso = new Date().toISOString().slice(0, 10);
    tris.add(triFromISO(hojeIso));
    return Array.from(tris).sort().reverse();
  }, [all]);

  const triSelecionado = tri || trimestres[0] || "";

  const colaboradores = useMemo(() => {
    const set = new Set<string>();
    all.forEach((p) => {
      const nome = String((p as any).colaborador ?? "").trim();
      if (nome) set.add(nome);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [all]);

  const baseTri = useMemo(() => {
    return all.filter((p) => (triSelecionado ? triFromISO(p.data) === triSelecionado : true));
  }, [all, triSelecionado]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseTri
      .filter((p) => (!colab ? true : String((p as any).colaborador ?? "") === colab))
      .filter((p) => {
        if (!q) return true;
        const nome = String((p as any).colaborador ?? "").toLowerCase();
        return nome.includes(q) || String(p.data).includes(q);
      });
  }, [baseTri, colab, query]);

  // ====== MÉTRICAS DE QUALIDADE (PRODUTIVIDADE) ======
  const quality = useMemo(() => {
    const pedidosTotal = sum(filtered.map((p) => Number(p.pedidos) || 0));
    const itensTotal = sum(filtered.map((p) => Number(p.itens) || 0));
    const errosTotal = sum(filtered.map((p) => Number(p.erros) || 0));
    const minutosTotal = sum(filtered.map((p) => Number(p.minutos) || 0));

    const operacoes = itensTotal + pedidosTotal;

    // assertividade base: (operações - erros) / operações
    const assertividadeBase =
      operacoes <= 0 ? 100 : Math.max(0, ((operacoes - errosTotal) / operacoes) * 100);

    // erros por 1.000 itens
    const errosPorMilItens = itensTotal <= 0 ? 0 : (errosTotal / itensTotal) * 1000;

    // assertividade ajustada (penalização mais “forte”):
    // cada erro “pesa” como 5 operações perdidas (ajustável)
    const PESO_ERRO = 5;
    const assertividadeAjustada =
      operacoes <= 0
        ? 100
        : Math.max(0, ((operacoes - errosTotal * PESO_ERRO) / operacoes) * 100);

    const registrosComErro = filtered.filter((p) => (Number(p.erros) || 0) > 0).length;

    // Ranking erros por colaborador
    const map = new Map<string, { erros: number; itens: number; pedidos: number; registros: number }>();
    filtered.forEach((p) => {
      const nome = String((p as any).colaborador ?? "—").trim() || "—";
      const cur = map.get(nome) ?? { erros: 0, itens: 0, pedidos: 0, registros: 0 };
      cur.erros += Number(p.erros) || 0;
      cur.itens += Number(p.itens) || 0;
      cur.pedidos += Number(p.pedidos) || 0;
      cur.registros += 1;
      map.set(nome, cur);
    });

    const ranking = Array.from(map.entries())
      .map(([nome, v]) => ({
        nome,
        ...v,
        errosPorMil: v.itens <= 0 ? 0 : (v.erros / v.itens) * 1000,
      }))
      .sort((a, b) => b.erros - a.erros);

    return {
      pedidosTotal,
      itensTotal,
      errosTotal,
      minutosTotal,
      operacoes,
      assertividadeBase,
      assertividadeAjustada,
      errosPorMilItens,
      registros: filtered.length,
      registrosComErro,
      ranking,
    };
  }, [filtered]);

  // ====== MÉTRICAS DE ERROS COM CUSTO (CUSTO-ERROS) ======
  const custo = useMemo(() => {
    const arr = loadCustoErros()
      .filter((e) => e?.data && (triSelecionado ? triFromISO(String(e.data)) === triSelecionado : true))
      .filter((e) => (!colab ? true : String(e.colaborador ?? "") === colab));

    const qtdTotal = sum(arr.map((e) => Number(e.quantidade) || 0));
    const custoTotal = sum(arr.map((e) => (Number(e.quantidade) || 0) * (Number(e.custo_unitario) || 0)));
    const custoMedio = qtdTotal <= 0 ? 0 : custoTotal / qtdTotal;

    return {
      registros: arr.length,
      qtdTotal,
      custoTotal,
      custoMedio,
    };
  }, [triSelecionado, colab]);

  // lista de registros com erro (pra auditoria)
  const registrosComErro = useMemo(() => {
    const list = filtered
      .filter((p) => (Number(p.erros) || 0) > 0)
      .map((p) => ({
        data: p.data,
        colaborador: String((p as any).colaborador ?? "—"),
        pedidos: Number(p.pedidos) || 0,
        itens: Number(p.itens) || 0,
        erros: Number(p.erros) || 0,
        minutos: Number(p.minutos) || 0,
      }))
      .sort((a, b) => (a.data < b.data ? 1 : -1));

    return list;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Qualidade"
        subtitle={`Assertividade + erros + custo dos erros — ${triSelecionado || "—"}`}
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

        <div style={{ opacity: 0.8, fontSize: 13 }}>Colaborador:</div>
        <select value={colab} onChange={(e) => setColab(e.target.value)} style={selectStyle}>
          <option value="" style={{ color: "black" }}>Todos</option>
          {colaboradores.map((c) => (
            <option key={c} value={c} style={{ color: "black" }}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar (nome ou data)..."
          style={{ ...inputStyle, minWidth: 240 }}
        />
      </div>

      {/* Cards - Qualidade */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card
          title="Assertividade (base)"
          value={pct(quality.assertividadeBase)}
          hint="(Itens + Pedidos - Erros) / (Itens + Pedidos)"
        />
        <Card
          title="Assertividade (ajustada)"
          value={pct(quality.assertividadeAjustada)}
          hint="Penaliza erro com peso (erro*5). Posso ajustar."
        />
        <Card
          title="Erros por 1.000 itens"
          value={quality.errosPorMilItens.toFixed(2)}
          hint="Erros / Itens * 1000"
        />

        <Card title="Erros (total)" value={String(quality.errosTotal)} />
        <Card title="Registros com erro" value={String(quality.registrosComErro)} hint="Lançamentos onde erros > 0" />
        <Card title="Registros (total)" value={String(quality.registros)} />
      </div>

      {/* Cards - Custo */}
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Erros com custo (qtd)" value={String(custo.qtdTotal)} hint={`Registros: ${custo.registros}`} />
        <Card title="Custo total dos erros" value={money(custo.custoTotal)} hint="Vem da página Custo dos Erros" />
        <Card title="Custo médio por erro" value={money(custo.custoMedio)} />
      </div>

      {/* Ranking por colaborador */}
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
          Ranking de erros por colaborador
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Colaborador</th>
              <th style={th}>Erros</th>
              <th style={th}>Erros / 1000 itens</th>
              <th style={th}>Itens</th>
              <th style={th}>Pedidos</th>
              <th style={th}>Registros</th>
            </tr>
          </thead>
          <tbody>
            {quality.ranking.map((r) => (
              <tr key={r.nome} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={td}><b>{r.nome}</b></td>
                <td style={td}>{r.erros}</td>
                <td style={td}>{r.errosPorMil.toFixed(2)}</td>
                <td style={td}>{r.itens}</td>
                <td style={td}>{r.pedidos}</td>
                <td style={td}>{r.registros}</td>
              </tr>
            ))}
            {quality.ranking.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Sem dados no trimestre selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Auditoria rápida: registros com erro */}
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
          Registros com erro (auditoria)
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Data</th>
              <th style={th}>Colaborador</th>
              <th style={th}>Pedidos</th>
              <th style={th}>Itens</th>
              <th style={th}>Erros</th>
              <th style={th}>Min</th>
            </tr>
          </thead>
          <tbody>
            {registrosComErro.map((r, idx) => (
              <tr key={`${r.data}-${r.colaborador}-${idx}`} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={td}>{r.data}</td>
                <td style={td}><b>{r.colaborador}</b></td>
                <td style={td}>{r.pedidos}</td>
                <td style={td}>{r.itens}</td>
                <td style={td}><b>{r.erros}</b></td>
                <td style={td}>{r.minutos}</td>
              </tr>
            ))}
            {registrosComErro.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Nenhum registro com erro no filtro atual.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          Se você quiser, no próximo passo eu adiciono um botão “Abrir no Custo dos Erros”
          e um campo para já registrar o custo do erro direto daqui.
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
