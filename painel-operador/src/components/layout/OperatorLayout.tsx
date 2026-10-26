import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function OperatorLayout() {
  return (
    <div className="operator-layout">
      <Sidebar />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}