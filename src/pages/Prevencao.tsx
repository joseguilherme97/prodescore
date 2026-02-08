import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "../components/PageHeader";
import { getProdutividades } from "../data/store";

type PrevencaoRegistro = {
  id: string;
  data: string; // ISO YYYY-MM-DD
  colaborador: string;

  avarias_detectadas: number;
  faltas_detectadas: number;
  divergencias_detectadas: number;
  caixas_salvas: number;
  observacao: string;
};

const KEY = "prodscore_prevencao";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function num(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\s/g, "");
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function normKey(k: any) {
  return String(k ?? "").trim().toLowerCase();
}

function toISODate(v: any): string {
  const s = safeStr(v);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function load(): PrevencaoRegistro[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PrevencaoRegistro[]) : [];
  } catch {
    return [];
  }
}
function save(list: PrevencaoRegistro[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function triFromISO(dateISO: string): string {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}T${q}`;
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

function pct(n: number) {
  return `${n.toFixed(2)}%`;
}

export default function Prevencao() {
  const [list, setList] = useState<PrevencaoRegistro[]>(() => load());
  const [query, setQuery] = useState("");
  const [tri, setTri] = useState<string>("");

  // Form
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [colaborador, setColaborador] = useState<string>("");
  const [avarias, setAvarias] = useState<number>(0);
  const [faltas, setFaltas] = useState<number>(0);
  const [divergencias, setDivergencias] = useState<number>(0);
  const [caixasSalvas, setCaixasSalvas] = useState<number>(0);
  const [observacao, setObservacao] = useState<string>("");

  const trimestres = useMemo(() => {
    const trisPrev = list.map((r) => triFromISO(r.data)).filter(Boolean);
    const trisProd = getProdutividades().map((p) => triFromISO(p.data)).filter(Boolean);
    const setAll = new Set([...trisPrev, ...trisProd]);
    return Array.from(setAll).sort().reverse();
  }, [list]);

  const triSelecionado = tri || trimestres[0] || "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((r) => (triSelecionado ? triFromISO(r.data) === triSelecionado : true))
      .filter((r) => {
        if (!q) return true;
        return (
          r.colaborador.toLowerCase().includes(q) ||
          r.data.includes(q) ||
          r.observacao.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [list, query, triSelecionado]);

  const stats = useMemo(() => {
    const totalPrevencoes = filtered.reduce(
      (acc, r) => acc + r.avarias_detectadas + r.faltas_detectadas + r.divergencias_detectadas,
      0
    );
    const av = filtered.reduce((acc, r) => acc + r.avarias_detectadas, 0);
    const fa = filtered.reduce((acc, r) => acc + r.faltas_detectadas, 0);
    const di = filtered.reduce((acc, r) => acc + r.divergencias_detectadas, 0);
    const caixas = filtered.reduce((acc, r) => acc + r.caixas_salvas, 0);

    const prod = getProdutividades().filter((p) =>
      triSelecionado ? triFromISO(p.data) === triSelecionado : true
    );
    const errosTotal = prod.reduce((acc, p) => acc + (Number((p as any).erros) || 0), 0);

    const base = totalPrevencoes + errosTotal;
    const prevPct = base <= 0 ? 0 : (totalPrevencoes / base) * 100;

    return { totalPrevencoes, av, fa, di, caixas, errosTotal, prevPct, registros: filtered.length };
  }, [filtered, triSelecionado]);

  function persist(next: PrevencaoRegistro[]) {
    setList(next);
    save(next);
  }

  function addManual() {
    const d = toISODate(data);
    const c = colaborador.trim();
    if (!d || !c) {
      alert("Preencha Data e Colaborador.");
      return;
    }

    const item: PrevencaoRegistro = {
      id: uid(),
      data: d,
      colaborador: c,
      avarias_detectadas: num(avarias),
      faltas_detectadas: num(faltas),
      divergencias_detectadas: num(divergencias),
      caixas_salvas: num(caixasSalvas),
      observacao: observacao.trim(),
    };

    persist([item, ...list]);

    setAvarias(0);
    setFaltas(0);
    setDivergencias(0);
    setCaixasSalvas(0);
    setObservacao("");
    alert("Registro de prevenção salvo.");
  }

  function remove(id: string) {
    const ok = confirm("Remover este registro?");
    if (!ok) return;
    persist(list.filter((x) => x.id !== id));
  }

  function clearAll() {
    const ok = confirm("Limpar TODOS os registros de prevenção?");
    if (!ok) return;
    localStorage.removeItem(KEY);
    setList([]);
  }

  function handleExcel(file: File) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      const normRows = rows.map((r) => {
        const obj: Record<string, any> = {};
        Object.keys(r).forEach((k) => (obj[normKey(k)] = r[k]));
        return obj;
      });

      const parsed: PrevencaoRegistro[] = normRows
        .map((r) => {
          const item: PrevencaoRegistro = {
            id: uid(),
            data: toISODate(r["data"] ?? r["dia"] ?? r["date"]),
            colaborador: safeStr(r["colaborador"] ?? r["nome"] ?? r["funcionario"]),
            avarias_detectadas: num(r["avarias_detectadas"] ?? r["avarias"] ?? r["avarias_detect"]),
            faltas_detectadas: num(r["faltas_detectadas"] ?? r["faltas"] ?? r["faltas_detect"]),
            divergencias_detectadas: num(
              r["divergencias_detectadas"] ?? r["divergencias"] ?? r["divergencias_detect"]
            ),
            caixas_salvas: num(r["caixas_salvas"] ?? r["caixas"] ?? r["volumes_salvos"]),
            observacao: safeStr(r["observacao"] ?? r["obs"] ?? r["descricao"]),
          };
          if (!item.data || !item.colaborador) return null;
          return item;
        })
        .filter(Boolean) as PrevencaoRegistro[];

      if (parsed.length === 0) {
        alert("Não encontrei linhas válidas no XLSX (precisa ter data e colaborador).");
        return;
      }

      persist([...parsed, ...list]);
      alert(`Importado: ${parsed.length} registros de prevenção.`);
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div>
      <PageHeader
        title="Prevenção"
        subtitle="Registre detecções (avarias/faltas/divergências) e acompanhe a cultura de prevenção."
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ opacity: 0.8, fontSize: 13 }}>Trimestre:</div>
        <select value={triSelecionado} onChange={(e) => setTri(e.target.value)} style={selectStyle}>
          {trimestres.length === 0 ? <option value="">—</option> : null}
          {trimestres.map((t) => (
            <option key={t} value={t} style={{ color: "black" }}>
              {t}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por colaborador, data ou observação..."
          style={{ ...inputStyle, minWidth: 280 }}
        />

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleExcel(f);
            e.currentTarget.value = "";
          }}
          style={inputStyle}
        />

        <button onClick={clearAll} style={btnDanger}>
          Limpar
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Prevenções (total)" value={String(stats.totalPrevencoes)} hint="Avarias + Faltas + Divergências" />
        <Card title="Erros do trimestre" value={String(stats.errosTotal)} hint="Vem dos lançamentos de produtividade" />
        <Card title="% Cultura de Prevenção" value={pct(stats.prevPct)} hint="Prevenções / (Prevenções + Erros)" />

        <Card title="Avarias detectadas" value={String(stats.av)} />
        <Card title="Faltas detectadas" value={String(stats.fa)} />
        <Card title="Divergências detectadas" value={String(stats.di)} />

        <Card title="Caixas salvas" value={String(stats.caixas)} hint="Opcional (se você usar)" />
        <Card title="Registros" value={String(stats.registros)} hint="Quantidade de lançamentos de prevenção" />
        <Card title="Trimestre" value={triSelecionado || "—"} />
      </div>

      <div
        style={{
          marginTop: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Novo registro (manual)</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr", gap: 10 }}>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
          <input value={colaborador} onChange={(e) => setColaborador(e.target.value)} placeholder="Colaborador" style={inputStyle} />
          <input type="number" value={avarias} onChange={(e) => setAvarias(num(e.target.value))} placeholder="Avarias" style={inputStyle} />
          <input type="number" value={faltas} onChange={(e) => setFaltas(num(e.target.value))} placeholder="Faltas" style={inputStyle} />
          <input type="number" value={divergencias} onChange={(e) => setDivergencias(num(e.target.value))} placeholder="Divergências" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr 1fr", gap: 10, marginTop: 10 }}>
          <input type="number" value={caixasSalvas} onChange={(e) => setCaixasSalvas(num(e.target.value))} placeholder="Caixas salvas (opcional)" style={inputStyle} />
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação (opcional)" style={inputStyle} />
          <button onClick={addManual} style={btnPrimary}>Salvar</button>
        </div>
      </div>

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
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Registros ({filtered.length})</div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Data</th>
              <th style={th}>Colaborador</th>
              <th style={th}>Avarias</th>
              <th style={th}>Faltas</th>
              <th style={th}>Divergências</th>
              <th style={th}>Caixas salvas</th>
              <th style={th}>Obs</th>
              <th style={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={td}>{r.data}</td>
                <td style={td}><b>{r.colaborador}</b></td>
                <td style={td}>{r.avarias_detectadas}</td>
                <td style={td}>{r.faltas_detectadas}</td>
                <td style={td}>{r.divergencias_detectadas}</td>
                <td style={td}>{r.caixas_salvas}</td>
                <td style={td}>{r.observacao || "—"}</td>
                <td style={td}>
                  <button onClick={() => remove(r.id)} style={btnDanger}>Remover</button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Sem registros para este trimestre/filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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

const btnPrimary: React.CSSProperties = {
  background: "rgba(0, 200, 180, 0.90)",
  border: "1px solid rgba(0, 200, 180, 0.90)",
  color: "black",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: "rgba(255, 80, 80, 0.18)",
  border: "1px solid rgba(255, 80, 80, 0.35)",
  color: "white",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const th: React.CSSProperties = { padding: "8px 6px" };
const td: React.CSSProperties = { padding: "8px 6px" };
