import {
  LayoutDashboard,
  Zap,
  Activity,
  WalletCards,
  BrainCircuit,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/api";

const menu = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Demanda",
    path: "/demand",
    icon: Activity,
  },
  {
    label: "Financeiro",
    path: "/finance",
    icon: WalletCards,
  },
  {
    label: "Inteligência",
    path: "/intelligence",
    icon: BrainCircuit,
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-icon">
            <Zap size={22} />
          </div>

          <div>
            <strong>ChargeGrid</strong>
            <span>Centro de Operações</span>
          </div>
        </div>

        <nav className="nav">
          {menu.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="system-status">
          <span className="status-dot" />

          <div>
            <strong>Sistema operacional</strong>
            <small>Serviços conectados</small>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}