import { Navigate, Outlet } from "react-router-dom";

const KEY_AUTH = "prodscore_auth_ok";

export default function RequireAuth() {
  const ok = localStorage.getItem(KEY_AUTH) === "1";
  return ok ? <Outlet /> : <Navigate to="/login" replace />;
}
