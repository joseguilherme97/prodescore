import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Lancar from "./pages/Lancar";
import Ranking from "./pages/Ranking";
import Metas from "./pages/Metas";
import Colaboradores from "./pages/Colaboradores";
import Qualidade from "./pages/Qualidade";
import Carteira from "./pages/Carteira";

import CustoErros from "./pages/CustoErros";
import Prevencao from "./pages/Prevencao";
import Enderecamento from "./pages/Enderecamento";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lancar" element={<Lancar />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/colaboradores" element={<Colaboradores />} />
        <Route path="/qualidade" element={<Qualidade />} />
        <Route path="/carteira" element={<Carteira />} />

        <Route path="/custo-erros" element={<CustoErros />} />
        <Route path="/prevencao" element={<Prevencao />} />
        <Route path="/enderecamento" element={<Enderecamento />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
