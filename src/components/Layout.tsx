import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/lancar", label: "Lançar Produtividade" },
  { to: "/ranking", label: "Ranking Trimestral" },
  { to: "/metas", label: "Metas" },
  { to: "/colaboradores", label: "Colaboradores" },
  { to: "/qualidade", label: "Qualidade" },
  { to: "/carteira", label: "Carteira" },
  { to: "/custo-erros", label: "Custo dos Erros" },
  { to: "/prevencao", label: "Prevenção" },
  { to: "/enderecamento", label: "Endereçamento" },
];

export default function Layout() {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandTitle">ProdScore</div>
          <div className="brandSub">Gamificação — Logística</div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
              end={item.to === "/dashboard"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="footer">
          <div className="muted">v1.0 • LocalStorage</div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
