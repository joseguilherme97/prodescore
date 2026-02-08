import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";

type Colaborador = {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: string; // ISO
};

const KEY = "prodscore_colaboradores";

// (Opcional) se quiser renomear lançamentos antigos também:
const KEY_PROD = "prodscore_produtividades";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(): Colaborador[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr as Colaborador[];
  } catch {
    return [];
  }
}

function save(list: Colaborador[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
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

export default function Colaboradores() {
  const [list, setList] = useState<Colaborador[]>(() => load());
  const [query, setQuery] = useState("");
  const [novoNome, setNovoNome] = useState("");

  // edição
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((c) => (q ? c.nome.toLowerCase().includes(q) : true))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [list, query]);

  const stats = useMemo(() => {
    const total = list.length;
    const ativos = list.filter((c) => c.ativo).length;
    const inativos = total - ativos;
    return { total, ativos, inativos };
  }, [list]);

  function persist(next: Colaborador[]) {
    setList(next);
    save(next);
  }

  function add() {
    const nome = normalizeName(novoNome);
    if (!nome) {
      alert("Digite o nome do colaborador.");
      return;
    }

    const exists = list.some((c) => c.nome.toLowerCase() === nome.toLowerCase());
    if (exists) {
      alert("Já existe um colaborador com esse nome.");
      return;
    }

    const item: Colaborador = {
      id: uid(),
      nome,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    persist([...list, item]);
    setNovoNome("");
    alert("Colaborador adicionado.");
  }

  function toggleAtivo(id: string) {
    const next = list.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c));
    persist(next);
  }

  function startEdit(c: Colaborador) {
    setEditId(c.id);
    setEditNome(c.nome);
  }

  function cancelEdit() {
    setEditId(null);
    setEditNome("");
  }

  // ✅ Edita só na lista de colaboradores (não mexe nos lançamentos antigos)
  function saveEditOnlyList() {
    if (!editId) return;
    const nome = normalizeName(editNome);
    if (!nome) {
      alert("Nome inválido.");
      return;
    }

    const exists = list.some(
      (c) => c.id !== editId && c.nome.toLowerCase() === nome.toLowerCase()
    );
    if (exists) {
      alert("Já existe outro colaborador com esse nome.");
      return;
    }

    const next = list.map((c) => (c.id === editId ? { ...c, nome } : c));
    persist(next);
    cancelEdit();
    alert("Nome atualizado.");
  }

  // ✅ (Opcional) Renomeia também nos lançamentos antigos
  function saveEditAndUpdateProd() {
    if (!editId) return;

    const old = list.find((c) => c.id === editId);
    if (!old) return;

    const nome = normalizeName(editNome);
    if (!nome) {
      alert("Nome inválido.");
      return;
    }

    const exists = list.some(
      (c) => c.id !== editId && c.nome.toLowerCase() === nome.toLowerCase()
    );
    if (exists) {
      alert("Já existe outro colaborador com esse nome.");
      return;
    }

    // 1) atualiza lista
    const next = list.map((c) => (c.id === editId ? { ...c, nome } : c));
    persist(next);

    // 2) atualiza produtividade (se existir)
    try {
      const raw = localStorage.getItem(KEY_PROD);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const updated = arr.map((p: any) => {
          if (String(p.colaborador ?? "").trim() === old.nome) {
            return { ...p, colaborador: nome };
          }
          return p;
        });
        localStorage.setItem(KEY_PROD, JSON.stringify(updated));
      }
    } catch {
      // se der erro, não quebra nada
    }

    cancelEdit();
    alert("Nome atualizado (incluindo lançamentos antigos).");
  }

  function remove(id: string) {
    const c = list.find((x) => x.id === id);
    const ok = confirm(`Excluir colaborador "${c?.nome ?? ""}"?`);
    if (!ok) return;

    persist(list.filter((x) => x.id !== id));
  }

  function clearAll() {
    const ok = confirm("Limpar TODOS os colaboradores?");
    if (!ok) return;
    localStorage.removeItem(KEY);
    setList([]);
  }

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        subtitle="Cadastre, edite e controle ativo/inativo. Salvo no navegador (localStorage)."
      />

      {/* Cards */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Card title="Total" value={String(stats.total)} />
        <Card title="Ativos" value={String(stats.ativos)} />
        <Card title="Inativos" value={String(stats.inativos)} />
      </div>

      {/* Barra de ações */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Novo colaborador (nome)"
          style={{ ...inputStyle, minWidth: 260 }}
        />
        <button onClick={add} style={btnPrimary}>Adicionar</button>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar colaborador..."
          style={{ ...inputStyle, minWidth: 220 }}
        />

        <button onClick={clearAll} style={btnDanger}>Limpar</button>
      </div>

      {/* Lista */}
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
          Colaboradores ({filtered.length})
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={th}>Nome</th>
              <th style={th}>Status</th>
              <th style={th}>Criado</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const isEdit = editId === c.id;

              return (
                <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={td}>
                    {isEdit ? (
                      <input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    ) : (
                      <b>{c.nome}</b>
                    )}
                  </td>

                  <td style={td}>
                    <span style={{ opacity: 0.9 }}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td style={td}>
                    {c.criadoEm ? new Date(c.criadoEm).toLocaleDateString("pt-BR") : "—"}
                  </td>

                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isEdit ? (
                        <>
                          <button onClick={saveEditOnlyList} style={btnPrimary}>
                            Salvar (lista)
                          </button>
                          <button onClick={saveEditAndUpdateProd} style={btnWarn}>
                            Salvar + atualizar lançamentos
                          </button>
                          <button onClick={cancelEdit} style={btnGhost}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(c)} style={btnGhost}>
                            Editar
                          </button>
                          <button onClick={() => toggleAtivo(c.id)} style={btnWarn}>
                            {c.ativo ? "Desativar" : "Ativar"}
                          </button>
                          <button onClick={() => remove(c.id)} style={btnDanger}>
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "12px 6px", opacity: 0.8 }}>
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          Dica: use “Desativar” para manter histórico sem apagar o nome.  
          Se quiser, eu conecto essa lista no “Lançar Produtividade” para virar um dropdown.
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

const btnPrimary: React.CSSProperties = {
  background: "rgba(0, 200, 180, 0.90)",
  border: "1px solid rgba(0, 200, 180, 0.90)",
  color: "black",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const btnWarn: React.CSSProperties = {
  background: "rgba(255, 200, 0, 0.12)",
  border: "1px solid rgba(255, 200, 0, 0.28)",
  color: "white",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 800,
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

const btnGhost: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const th: React.CSSProperties = { padding: "8px 6px" };
const td: React.CSSProperties = { padding: "8px 6px" };
