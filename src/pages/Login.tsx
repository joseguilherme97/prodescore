import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";

const KEY_AUTH = "prodscore_auth_ok";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  function entrar() {
    // Login simples (opção A): fixo e local
    if (usuario.trim().toLowerCase() === "admin" && senha === "1234") {
      localStorage.setItem(KEY_AUTH, "1");
      navigate("/dashboard", { replace: true });
      return;
    }
    alert("Usuário ou senha inválidos");
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <PageHeader title="Login" subtitle="Acesso simples (local) para proteger o sistema" />

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <input
          placeholder="Usuário (admin)"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          placeholder="Senha (1234)"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <button onClick={entrar}>Entrar</button>

        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          * Depois a gente troca por login de verdade (Firebase/Supabase), mas isso já protege as rotas.
        </div>
      </div>
    </div>
  );
}
