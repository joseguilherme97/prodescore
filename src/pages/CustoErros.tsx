import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "../components/PageHeader";

type ErroItem = {
  id: string;
  data: string; // ISO YYYY-MM-DD
  colaborador: string;
  tipo: string;
  descricao: string;
  quantidade: number;
  custo_unitario: number; // R$
};

const KEY = "prodscore_custo_erros";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function num(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  // aceita 1.234,56 / 1234,56 / 1234.56
  const s = String(v).trim().replace(/\s/g, "").replace("R$", "");
  const normalized =
    s.includes(",") && s.includes(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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

function triFromISO(dateISO: string): string {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}T${q}`;
}

function normKey(k: any) {
  return String(k ?? "").trim().toLowerCase();
}

function load(): ErroItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ErroItem[]) : [];
  } catch {
    return [];
  }
}

function save(list: ErroItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
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

export default function CustoErros() {
  const [list, setList] = useState<ErroItem[]>(() => load());
  const [query, setQuery] = useState("");
  const [tri, setTri] = useState<string>("");

  // Form
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [colaborador, setColaborador] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [descricao, setDescricao] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [custoUnit, setCustoUnit] = useState<number>(0);

  const trimestres = useMemo(() => {
    const tris = list.map((r) => triFromISO(r.data)).filter(Boolean);
    const setAll = new Set(tris);
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
          r.tipo.toLowerCase().includes(q) ||
          r.descricao.toLowerCase().includes(q) ||
          r.data.includes(q)
        );
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [list, query, triSelecionado]);

  const stats = useMemo(() => {
    const totalRegistros = filtered.length;
    const totalQtd = filtered.reduce((acc, r) => acc + r.quantidade, 0);
    const totalCusto = filtered.reduce((acc, r) => acc + r.quantidade * r.custo_unitario, 0);
    const custoMedio = totalQtd <= 0 ? 0 : totalCusto / totalQtd;

    const porColaborador = new Map<string, { qtd: number; custo: number }>();
    filtered.forEach((r) => {
      const cur = porColaborador.get(r.colaborador) ?? { qtd: 0, custo: 0 };
      cur.qtd += r.quantidade;
      cur.custo += r.quantidade * r.custo_unitario;
      porColaborador.set(r.colaborador, cur);
    });

    const ranking = Array.from(porColaborador.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.custo - a.custo);

    return { totalRegistros, totalQtd, totalCusto, custoMedio, ranking };
  }, [filtered]);

  function persist(next: ErroItem[]) {
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

    const item: ErroItem = {
      id: uid(),
      data: d,
      colaborador: c,
      tipo: tipo.trim() || "—",
      descricao: descricao.trim() || "—",
      quantidade: Math.max(1, Math.floor(num(quantidade))),
      custo_unitario: num(custoUnit),
    };

    persist([item, ...list]);

    setTipo("");
    setDescricao("");
    setQuantidade(1);
    setCustoUnit(0);
    alert("Erro/custo salvo.");
  }

  function remove(id: string) {
    const ok = confirm("Remover este registro?");
    if (!ok) return;
    persist(list.filter((x) => x.id !== id));
  }

  function clearAll() {
    const ok = confirm("Limpar TODOS os registros de custo de erro?");
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

      const parsed: ErroItem[] = normRows
        .map((r) => {
          const item: ErroItem = {
            id: uid(),
            data: toISODate(r["data"] ?? r["dia"] ?? r["date"]),
            colaborador: safeStr(r["colaborador"] ?? r["nome"] ?? r["funcionario"]),
            tipo: safeStr(r["tipo"] ?? r["categoria"] ?? "—"),
            descricao: safeStr(r["descricao"] ?? r["descrição"] ?? r["obs"] ?? "—"),
            quantidade: Math.max(1, Math.floor(num(r["quantidade"] ?? r["qtd"] ?? 1))),
            custo_unitario: num(r["custo_unitario"] ?? r["custo"] ?? r["valor"]),
          };
          if (!item.data || !item.colaborador) return null;
          return item;
        })
        .filter(Boolean) as ErroItem[];

      if (parsed.length === 0) {
        alert("Não encontrei linhas válidas no XLSX (precisa ter data e colaborador).");
        return;
      }

      persist([...parsed, ...list]);
      alert(`Importado: ${parsed.length} registros de custos.`);
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div>
      <PageHeader
        title="Custo dos Erros"
        subtitle="Registre erros com custo (R$), veja impacto por trimestre e por colaborador."
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
          placeholder="Buscar por colaborador, tipo, descrição ou data..."
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
        <Card title="Registros" value={String(stats.totalRegistros)} hint="Quantidade de lançamentos" />
        <Card title="Erros (qtd total)" value={String(stats.totalQtd)} hint="Soma das quantidades" />
        <Card title="Custo Total" value={money(stats.totalCusto)} hint="Qtd × custo unitário" />

        <Card title="Custo médio por erro" value={money(stats.custoMedio)} />
        <Card title="Trimestre" value={triSelecionado || "—"} />
        <Card title="Top impacto" value={stats.ranking[0]?.nome || "—"} hint={stats.ranking[0] ? money(stats.ranking[0].custo) : ""} />
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 10 }}>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
          <input value={colaborador} onChange={(e) => setColaborador(e.target.value)} placeholder="Colaborador" style={inputStyle} />
          <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo (ex: separação, conferência)" style={inputStyle} />
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <input type="number" value={quantidade} onChange={(e) => setQuantidade(num(e.target.value))} placeholder="Quantidade" style={inputStyle} />
          <input type="number" value={custoUnit} onChange={(e) => setCustoUnit(num(e.target.value))} placeholder="Custo unitário (R$)" style={inputStyle} />
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
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Ranking por colaborador (custo)</div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Colaborador</th>
              <th style={th}>Qtd erros</th>
              <th style={th}>Custo</th>
            </tr>
          </thead>
          <tbody>
            {stats.ranking.map((r) => (
              <tr key={r.nome} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={td}><b>{r.nome}</b></td>
                <td style={td}>{r.qtd}</td>
                <td style={td}>{money(r.custo)}</td>
              </tr>
            ))}
            {stats.ranking.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Sem dados no trimestre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ fontWeight: 900, marginTop: 16, marginBottom: 10 }}>Registros</div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Data</th>
              <th style={th}>Colaborador</th>
              <th style={th}>Tipo</th>
              <th style={th}>Descrição</th>
              <th style={th}>Qtd</th>
              <th style={th}>Custo unit.</th>
              <th style={th}>Total</th>
              <th style={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={td}>{r.data}</td>
                <td style={td}><b>{r.colaborador}</b></td>
                <td style={td}>{r.tipo}</td>
                <td style={td}>{r.descricao}</td>
                <td style={td}>{r.quantidade}</td>
                <td style={td}>{money(r.custo_unitario)}</td>
                <td style={td}>{money(r.quantidade * r.custo_unitario)}</td>
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
