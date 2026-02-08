import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "../components/PageHeader";

type EstoqueItem = {
  id: string;
  sku: string;
  endereco: string;
  descricao: string;
  quantidade_caixas: number;
  quantidade_por_caixa: number;
};

const KEY = "prodscore_estoque_enderecamento";
const CAPACIDADE_TOTAL_CAIXAS = 2800;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function num(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s = String(v).trim().replace(/\s/g, "");
  // aceita 1.234,56 / 1234,56 / 1234.56
  const normalized =
    s.includes(",") && s.includes(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function load(): EstoqueItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as EstoqueItem[]) : [];
  } catch {
    return [];
  }
}

function save(list: EstoqueItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function pct(n: number) {
  return `${n.toFixed(2)}%`;
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

function Gauge({ value }: { value: number }) {
  // value: 0..100
  const v = Math.max(0, Math.min(100, value));
  const label =
    v >= 95 ? "Crítico" : v >= 85 ? "Alto" : v >= 70 ? "Atenção" : "Normal";

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>Ocupação do Estoque</div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{label}</div>
      </div>

      <div
        style={{
          marginTop: 10,
          height: 16,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${v}%`,
            height: "100%",
            background: "rgba(0, 200, 180, 0.90)",
          }}
        />
      </div>

      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
        {pct(v)} da capacidade ({CAPACIDADE_TOTAL_CAIXAS} caixas)
      </div>
    </div>
  );
}

function normKey(k: any) {
  return String(k ?? "").trim().toLowerCase();
}

export default function Enderecamento() {
  const [list, setList] = useState<EstoqueItem[]>(() => load());
  const [query, setQuery] = useState("");

  // form manual
  const [sku, setSku] = useState("");
  const [endereco, setEndereco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [qtdCaixas, setQtdCaixas] = useState<number>(0);
  const [qtdPorCaixa, setQtdPorCaixa] = useState<number>(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((i) => {
        if (!q) return true;
        return (
          i.sku.toLowerCase().includes(q) ||
          i.endereco.toLowerCase().includes(q) ||
          i.descricao.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [list, query]);

  const stats = useMemo(() => {
    const totalCaixas = list.reduce((acc, i) => acc + (Number(i.quantidade_caixas) || 0), 0);
    const totalItens = list.reduce(
      (acc, i) =>
        acc + (Number(i.quantidade_caixas) || 0) * (Number(i.quantidade_por_caixa) || 0),
      0
    );
    const ocupacao = CAPACIDADE_TOTAL_CAIXAS <= 0 ? 0 : (totalCaixas / CAPACIDADE_TOTAL_CAIXAS) * 100;
    return { totalCaixas, totalItens, ocupacao };
  }, [list]);

  function persist(next: EstoqueItem[]) {
    setList(next);
    save(next);
  }

  function addManual() {
    const s = safeStr(sku);
    if (!s) {
      alert("Informe o SKU.");
      return;
    }

    const item: EstoqueItem = {
      id: uid(),
      sku: s,
      endereco: safeStr(endereco),
      descricao: safeStr(descricao),
      quantidade_caixas: Math.max(0, Math.floor(num(qtdCaixas))),
      quantidade_por_caixa: Math.max(0, Math.floor(num(qtdPorCaixa))),
    };

    persist([item, ...list]);

    setSku("");
    setEndereco("");
    setDescricao("");
    setQtdCaixas(0);
    setQtdPorCaixa(0);

    alert("Item cadastrado ✅");
  }

  function remove(id: string) {
    const ok = confirm("Remover este item?");
    if (!ok) return;
    persist(list.filter((x) => x.id !== id));
  }

  // ✅ editar caixas direto na tabela
  function updateCaixas(id: string, value: number) {
    const next = list.map((x) =>
      x.id === id ? { ...x, quantidade_caixas: Math.max(0, Math.floor(value)) } : x
    );
    persist(next);
  }

  function updateQtdPorCaixa(id: string, value: number) {
    const next = list.map((x) =>
      x.id === id ? { ...x, quantidade_por_caixa: Math.max(0, Math.floor(value)) } : x
    );
    persist(next);
  }

  function handleExcel(file: File) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataArr = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(dataArr, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      const normRows = rows.map((r) => {
        const obj: Record<string, any> = {};
        Object.keys(r).forEach((k) => (obj[normKey(k)] = r[k]));
        return obj;
      });

      // aceita variações comuns de nomes de coluna:
      // sku / codigo / código
      // endereco / endereçamento / endereço
      // descricao / descrição
      // quantidade_caixas / qtd_caixas / caixas
      // quantidade_por_caixa / qtd_por_caixa / por_caixa
      const parsed: EstoqueItem[] = normRows
        .map((r) => {
          const item: EstoqueItem = {
            id: uid(),
            sku: safeStr(r["sku"] ?? r["codigo"] ?? r["código"] ?? r["cod"] ?? r["codigo/sku"]),
            endereco: safeStr(r["endereco"] ?? r["endereço"] ?? r["endereçamento"] ?? r["local"] ?? r["address"]),
            descricao: safeStr(r["descricao"] ?? r["descrição"] ?? r["desc"]),
            quantidade_caixas: Math.max(0, Math.floor(num(r["quantidade_caixas"] ?? r["qtd_caixas"] ?? r["caixas"] ?? r["quantidade de caixas"]))),
            quantidade_por_caixa: Math.max(0, Math.floor(num(r["quantidade_por_caixa"] ?? r["qtd_por_caixa"] ?? r["por_caixa"] ?? r["itens_por_caixa"]))),
          };
          if (!item.sku) return null;
          return item;
        })
        .filter(Boolean) as EstoqueItem[];

      if (parsed.length === 0) {
        alert("Não encontrei linhas válidas no XLSX. Precisa ter pelo menos a coluna SKU.");
        return;
      }

      persist([...parsed, ...list]);
      alert(`Importado: ${parsed.length} linhas ✅`);
    };

    reader.readAsArrayBuffer(file);
  }

  function clearAll() {
    const ok = confirm("Limpar TODOS os itens de endereçamento?");
    if (!ok) return;
    localStorage.removeItem(KEY);
    setList([]);
  }

  return (
    <div>
      <PageHeader
        title="Endereçamento / Estoque"
        subtitle={`Capacidade fixa: ${CAPACIDADE_TOTAL_CAIXAS} caixas — edite caixas direto na tabela`}
      />

      {/* Cards + gauge */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Total de Caixas" value={stats.totalCaixas.toLocaleString("pt-BR")} />
        <Card title="Total de Itens" value={stats.totalItens.toLocaleString("pt-BR")} />
        <Card
          title="Ocupação"
          value={pct(stats.ocupacao)}
          hint={`${stats.totalCaixas.toLocaleString("pt-BR")} / ${CAPACIDADE_TOTAL_CAIXAS.toLocaleString("pt-BR")} caixas`}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <Gauge value={stats.ocupacao} />
      </div>

      {/* Ações */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por SKU, endereço ou descrição..."
          style={{ ...inputStyle, minWidth: 300 }}
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

        <button onClick={clearAll} style={btnDanger}>Limpar</button>
      </div>

      {/* Cadastro manual */}
      <div style={{ ...panel, marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Cadastrar SKU (manual)</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 }}>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU / Código" style={inputStyle} />
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço" style={inputStyle} />
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <input
            type="number"
            value={qtdCaixas}
            onChange={(e) => setQtdCaixas(num(e.target.value))}
            placeholder="Quantidade de caixas"
            style={inputStyle}
          />
          <input
            type="number"
            value={qtdPorCaixa}
            onChange={(e) => setQtdPorCaixa(num(e.target.value))}
            placeholder="Quantidade por caixa"
            style={inputStyle}
          />
          <button onClick={addManual} style={btnPrimary}>Salvar</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ ...panel, marginTop: 12, overflowX: "auto" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          Itens ({filtered.length})
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>SKU</th>
              <th style={th}>Endereço</th>
              <th style={th}>Descrição</th>
              <th style={th}>Caixas (editável)</th>
              <th style={th}>Qtd/caixa (editável)</th>
              <th style={th}>Total itens</th>
              <th style={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const totalItens = (i.quantidade_caixas || 0) * (i.quantidade_por_caixa || 0);

              return (
                <tr key={i.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={td}><b>{i.sku}</b></td>
                  <td style={td}>{i.endereco}</td>
                  <td style={td}>{i.descricao}</td>

                  <td style={td}>
                    <input
                      type="number"
                      value={i.quantidade_caixas}
                      onChange={(e) => updateCaixas(i.id, num(e.target.value))}
                      style={{ ...inputStyle, width: 140 }}
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="number"
                      value={i.quantidade_por_caixa}
                      onChange={(e) => updateQtdPorCaixa(i.id, num(e.target.value))}
                      style={{ ...inputStyle, width: 160 }}
                    />
                  </td>

                  <td style={td}>{totalItens.toLocaleString("pt-BR")}</td>

                  <td style={td}>
                    <button onClick={() => remove(i.id)} style={btnDanger}>Remover</button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Sem itens cadastrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          Agora você consegue editar a quantidade de caixas direto na tabela ✅
        </div>
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */
const panel: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 14,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "white",
  padding: "10px 12px",
  borderRadius: 12,
  outline: "none",
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
