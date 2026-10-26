import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Zap } from "lucide-react";

import { login } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await login(password);

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao realizar login"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Zap size={28} />
        </div>

        <h1>ChargeGrid</h1>

        <p className="login-subtitle">
          Centro de Operações
        </p>

        <form onSubmit={handleSubmit}>
          <label>Senha do operador</label>

          <div className="login-input">
            <Lock size={17} />

            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Entrando..."
              : "Entrar no painel"}
          </button>
        </form>

        <span className="login-footer">
          GoodWe • ChargeGrid Operator
        </span>
      </div>
    </div>
  );
}