import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { clearMetasTrimestre, getMetasTrimestre, saveMetaTrimestre } from "../data/store";
import type { MetaTrimestre } from "../types";

function nowTrimestre(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const t = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return `${y}T${t}`;
}

function Input(props: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ opacity: 0.8, fontSize: 12 }}>{props.label}</div>
      <input
        value={props.value as any}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "white",
          padding: "10px 12px",
          borderRadius: 12,
          outline: "none",
        }}
      />
    </div>
  );
}

export default function Metas() {
  const [trimestre, setTrimestre] = useState(nowTrimestre());
  const [metaPontos, setMetaPontos] = useState("100000");
  const [metaErrosMax, setMetaErrosMax] = useState("5");

  const metas = useMemo(() => getMetasTrimestre(), []);

  const salvar = () => {
    const m: MetaTrimestre = {
      trimestre: trimestre.trim(),
      metaPontos: Number(metaPontos) || 0,
      metaErrosMax: Number(metaErrosMax) || 0,
    };
    if (!m.trimestre) return alert("Informe o trimestre (ex: 2026T1).");
    saveMetaTrimestre(m);
    alert("Meta salva ✅");
    window.location.reload();
  };

  const limpar = () => {
    if (!confirm("Apagar TODAS as metas trimestrais?")) return;
    clearMetasTrimestre();
    alert("Metas apagadas ✅");
    window.location.reload();
  };

  return (
    <div style={{ padding: 18 }}>
      <PageHeader title="Metas Trimestrais" subtitle="Define meta do trimestre e limite máximo de erros (regra dura)" />

      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Nova meta / Editar meta</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Input label="Trimestre" value={trimestre} onChange={setTrimestre} placeholder="Ex: 2026T1" />
          <Input label="Meta de pontos (trimestre)" value={metaPontos} onChange={setMetaPontos} type="number" />
          <Input label="Erros máximos (trimestre)" value={metaErrosMax} onChange={setMetaErrosMax} type="number" />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={salvar}
            style={{
              background: "rgba(0,180,255,0.25)",
              border: "1px solid rgba(0,180,255,0.35)",
              color: "white",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Salvar meta
          </button>

          <button
            onClick={limpar}
            style={{
              background: "rgba(255,80,80,0.18)",
              border: "1px solid rgba(255,80,80,0.30)",
              color: "white",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Apagar todas metas
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
          Regra sugerida (próximo passo): se erros do trimestre &gt; erros máximos, o score do trimestre zera.
        </div>
      </div>

      <div style={{ marginTop: 16, opacity: 0.9, fontWeight: 900 }}>Metas salvas</div>
      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        {metas.length === 0 ? (
          <div style={{ opacity: 0.8, fontSize: 12 }}>— Nenhuma meta cadastrada.</div>
        ) : (
          metas
            .sort((a, b) => a.trimestre.localeCompare(b.trimestre))
            .map((m) => (
              <div
                key={m.trimestre}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontWeight: 900 }}>{m.trimestre}</div>
                <div style={{ opacity: 0.9, fontSize: 12 }}>
                  Meta pontos: <b>{m.metaPontos}</b> · Erros máx: <b>{m.metaErrosMax}</b>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
