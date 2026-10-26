import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import OperatorLayout from "./components/layout/OperatorLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Stations from "./pages/Stations";
import Sessions from "./pages/Sessions";
import Customers from "./pages/Customers";
import Demand from "./pages/Demand";
import Finance from "./pages/Finance";
import Intelligence from "./pages/Intelligence";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <OperatorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/demand" element={<Demand />} />
          <Route path="/finance" element={<Finance />} />
          <Route
            path="/intelligence"
            element={<Intelligence />}
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;