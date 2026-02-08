import PageHeader from "../components/PageHeader";
import { getProdutividades } from "../data/store";
import type { Produtividade } from "../types";

function currentTri(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${yyyy}T${q}`;
}

function triFromISO(dateISO: string): string {
  // espera "YYYY-MM-DD"
  const y = Number(dateISO.slice(0, 4));
  const m = Number(dateISO.slice(5, 7));
  if (!y || !m) return "SemData";
  const q = Math.floor((m - 1) / 3) + 1;
  return `${y}T${q}`;
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function num(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function Card(props: { title: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 14,
        minHeight: 86,
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

export default function Ranking() {
  const all = getProdutividades();

  // lista de trimestres disponíveis (ordenado desc)
  const trimestres = Array.from(new Set(all.map((p) => triFromISO(p.data))))
    .filter((t) => t && t !== "SemData")
    .sort()
    .reverse();

  const triPadrao = trimestres.includes(currentTri())
    ? currentTri()
    : trimestres[0] || currentTri();

  // state simples sem useState (pra não travar você): usa querystring
  const url = new URL(window.location.href);
  const triSelecionado = url.searchParams.get("tri") || triPadrao;

  const dados = all.filter((p) => triFromISO(p.data) === triSelecionado);

  const pedidosTotal = sum(dados.map((d) => num(d.pedidos)));
  const itensTotal = sum(dados.map((d) => num(d.itens)));
  const errosTotal = sum(dados.map((d) => num(d.erros)));
  const errosPorMil =
    itensTotal > 0 ? Number(((errosTotal / itensTotal) * 1000).toFixed(2)) : 0;

  // agrupamento por colaborador
  const mapa = new Map<string, Produtividade[]>();
  for (const p of dados) {
    const nome = (p.colaborador || "").trim() || "SemNome";
    const arr = mapa.get(nome) || [];
    arr.push(p);
    mapa.set(nome, arr);
  }

  const rows = Array.from(mapa.entries()).map(([colaborador, list]) => {
    const pedidos = sum(list.map((x) => num(x.pedidos)));
    const itens = sum(list.map((x) => num(x.itens)));
    const erros = sum(list.map((x) => num(x.erros)));
    const registros = list.length;

    // score médio: reaproveita a lógica simples do “score final” do seu projeto
    // aqui vamos aproximar pelo que já está consistente no app:
    // score bruto = itens + pedidos; penalidade = erros * 100; score = max(0, bruto - penalidade)
    const scores = list.map((x) => {
      const bruto = num(x.itens) + num(x.pedidos);
      const penal = num(x.erros) * 100;
      return Math.max(0, bruto - penal);
    });
    const scoreMedio =
      scores.length > 0 ? sum(scores) / scores.length : 0;

    return {
      colaborador,
      scoreMedio: Number(scoreMedio.toFixed(1)),
      pedidos,
      itens,
      erros,
      registros,
    };
  });

  rows.sort((a, b) => b.scoreMedio - a.scoreMedio);

  const top = rows[0];

  function setTri(t: string) {
    const next = new URL(window.location.href);
    next.searchParams.set("tri", t);
    window.location.href = next.toString();
  }

  return (
    <>
      <PageHeader
        title="Ranking Trimestral"
        subtitle="Ranking por trimestre usando dados lançados"
      />

      {/* filtro */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ opacity: 0.8, fontSize: 13 }}>Trimestre:</div>
        <select
          value={triSelecionado}
          onChange={(e) => setTri(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "white",
            padding: "10px 12px",
            borderRadius: 12,
            outline: "none",
            minWidth: 140,
          }}
        >
          {trimestres.length === 0 ? (
            <option value={triPadrao}>{triPadrao}</option>
          ) : (
            trimestres.map((t) => (
              <option key={t} value={t} style={{ color: "black" }}>
                {t}
              </option>
            ))
          )}
        </select>
      </div>

      {/* cards */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card
          title="Pedidos (total)"
          value={String(pedidosTotal)}
          hint="Soma dos pedidos no trimestre"
        />
        <Card
          title="Itens (total)"
          value={String(itensTotal)}
          hint="Soma dos itens no trimestre"
        />
        <Card
          title="Erros / 1000 itens"
          value={String(errosPorMil)}
          hint={`Erros: ${errosTotal}`}
        />
      </div>

      {/* destaque top */}
      <div
        style={{
          marginTop: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ opacity: 0.75, fontSize: 12 }}>Top do período</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
          {top ? top.colaborador : "—"}
        </div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Score médio: {top ? top.scoreMedio : "—"}
        </div>
      </div>

      {/* tabela */}
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
        <div style={{ fontWeight: 800, marginBottom: 10 }}>
          Ranking (por score médio) — {triSelecionado}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={{ padding: "8px 6px" }}>#</th>
              <th style={{ padding: "8px 6px" }}>Colaborador</th>
              <th style={{ padding: "8px 6px" }}>Score médio</th>
              <th style={{ padding: "8px 6px" }}>Pedidos</th>
              <th style={{ padding: "8px 6px" }}>Itens</th>
              <th style={{ padding: "8px 6px" }}>Erros</th>
              <th style={{ padding: "8px 6px" }}>Registros</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.colaborador}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  opacity: 0.95,
                }}
              >
                <td style={{ padding: "8px 6px" }}>{idx + 1}</td>
                <td style={{ padding: "8px 6px", fontWeight: 700 }}>
                  {r.colaborador}
                </td>
                <td style={{ padding: "8px 6px" }}>{r.scoreMedio}</td>
                <td style={{ padding: "8px 6px" }}>{r.pedidos}</td>
                <td style={{ padding: "8px 6px" }}>{r.itens}</td>
                <td style={{ padding: "8px 6px" }}>{r.erros}</td>
                <td style={{ padding: "8px 6px" }}>{r.registros}</td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Sem dados para este trimestre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* responsivo */}
      <div style={{ height: 12 }} />
      <style>{`
        @media (max-width: 920px) {
          .grid3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
