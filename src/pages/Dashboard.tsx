import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { getProdutividades } from "../data/store";
import type { Produtividade } from "../types";

/* =========================
   HELPERS
========================= */
function currentTri(): string {
  const iso = new Date().toISOString().slice(0, 10);
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}T${q}`;
}

function triFromISO(dateISO: string): string {
  if (!dateISO) return "";
  const year = Number(String(dateISO).slice(0, 4));
  const month = Number(String(dateISO).slice(5, 7));
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}T${q}`;
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function calcScore(p: Produtividade) {
  const pontosItens = Number(p.itens) * 1;
  const pontosPedidos = Number(p.pedidos) * 2;
  const penalidade = Number(p.erros) * 60;

  const bruto = pontosItens + pontosPedidos;
  const final = Math.max(0, bruto - penalidade);

  return { bruto, final, penalidade };
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

/* =========================
   DASHBOARD
========================= */
export default function Dashboard() {
  const triAtual = currentTri();
  const all = getProdutividades();

  // Lista única de colaboradores (ordenada)
  const colaboradores = useMemo(() => {
    return Array.from(
      new Set((all || []).map((p) => String(p.colaborador || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [all]);

  // Filtro selecionado
  const [colaboradorSelecionado, setColaboradorSelecionado] =
    useState<string>("TODOS");

  // Dados filtrados (trimestre + colaborador)
  const dados = useMemo(() => {
    return (all || []).filter((p) => {
      const mesmoTri = triFromISO(p.data) === triAtual;
      const mesmoColaborador =
        colaboradorSelecionado === "TODOS" ||
        String(p.colaborador || "").trim() === colaboradorSelecionado;

      return mesmoTri && mesmoColaborador;
    });
  }, [all, triAtual, colaboradorSelecionado]);

  /* =========================
     KPIs
  ========================= */
  const pedidosTotal = sum(dados.map((d) => Number(d.pedidos) || 0));
  const itensTotal = sum(dados.map((d) => Number(d.itens) || 0));
  const errosTotal = sum(dados.map((d) => Number(d.erros) || 0));
  const minutosTotal = sum(dados.map((d) => Number(d.minutos) || 0));

  const scores = dados.map(calcScore);
  const scoreBruto = sum(scores.map((s) => s.bruto));
  const penalidadeTotal = sum(scores.map((s) => s.penalidade));
  const scoreFinal = sum(scores.map((s) => s.final));

  const totalOperacoes = itensTotal + pedidosTotal;
  const acuracidade =
    totalOperacoes <= 0
      ? 100
      : Math.max(0, ((totalOperacoes - errosTotal) / totalOperacoes) * 100);

  const errosPor100Itens =
    itensTotal <= 0 ? 0 : (errosTotal / itensTotal) * 100;

  const horas = minutosTotal / 60;
  const scorePorHora = horas <= 0 ? 0 : scoreFinal / horas;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`KPIs do trimestre (${triAtual})`} />

      {/* FILTRO */}
      <div
        style={{
          marginTop: 14,
          marginBottom: 14,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ opacity: 0.85, fontSize: 13 }}>
          Filtrar por colaborador:
        </label>

        <select
          value={colaboradorSelecionado}
          onChange={(e) => setColaboradorSelecionado(e.target.value)}
          style={{
            backgroundColor: "#0f172a", // fundo escuro
            color: "#ffffff",
            border: "1px solid #334155",
            borderRadius: 10,
            padding: "8px 12px",
            minWidth: 240,
            outline: "none",
          }}
        >
          <option
            value="TODOS"
            style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
          >
            Todos
          </option>

          {colaboradores.map((c) => (
            <option
              key={c}
              value={c}
              style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
            >
              {c}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
          Registros filtrados: <strong>{dados.length}</strong>
        </div>
      </div>

      {/* CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Pedidos (total)" value={String(pedidosTotal)} />
        <Card title="Itens (total)" value={String(itensTotal)} />
        <Card title="Erros (total)" value={String(errosTotal)} />

        <Card title="Tempo (min)" value={String(minutosTotal)} />
        <Card
          title="Score Total"
          value={scoreFinal.toFixed(0)}
          hint={`Bruto: ${scoreBruto.toFixed(0)} | Penalidade: ${penalidadeTotal.toFixed(0)}`}
        />
        <Card title="Score por Hora" value={scorePorHora.toFixed(1)} />

        <Card
          title="Acuracidade"
          value={pct(acuracidade)}
          hint="(Pedidos + Itens - Erros) / Total"
        />
        <Card
          title="Erros por 100 itens"
          value={errosPor100Itens.toFixed(2)}
          hint="Erros / Itens * 100"
        />
        <Card title="Registros" value={String(dados.length)} />
      </div>
    </div>
  );
}
