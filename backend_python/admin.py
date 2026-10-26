"""
Rotas do painel administrativo (dashboard da empresa).

- POST /api/admin/login      -> troca a senha (ADMIN_PASSWORD do .env) por um token
- GET  /api/admin/dashboard  -> todos os números do dashboard em uma chamada
- GET  /api/admin/vehicles   -> lista de veículos

Todas as rotas /api/admin/* (menos o login) exigem o header:
    Authorization: Bearer <token>
"""

import os
import secrets
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from ai.insights import generate_operational_insights

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from database import get_connection

TZ_NAME = "America/Sao_Paulo"
TZ = ZoneInfo(TZ_NAME)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Tokens válidos enquanto a API estiver rodando (reiniciou = login de novo).
_tokens: set[str] = set()
security = HTTPBearer()

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Autenticação ────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    password: str


@router.post("/login")
def admin_login(data: AdminLoginRequest):
    if not ADMIN_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_PASSWORD não configurada no .env da API",
        )
    if not secrets.compare_digest(data.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Senha incorreta.")

    token = secrets.token_urlsafe(32)
    _tokens.add(token)
    return {"token": token}


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    if token not in _tokens:
        raise HTTPException(
            status_code=401,
            detail="Não autorizado"
        )

    return token


# ── Helpers ─────────────────────────────────────────────────────────

def _periodo(period: str):
    """Retorna (inicio, fim, inicio_anterior, granularidade)."""
    agora = datetime.now(TZ)
    meia_noite = agora.replace(hour=0, minute=0, second=0, microsecond=0)

    if period == "today":
        inicio, bucket = meia_noite, "hour"
    elif period == "7d":
        inicio, bucket = meia_noite - timedelta(days=6), "day"
    elif period == "30d":
        inicio, bucket = meia_noite - timedelta(days=29), "day"
    else:
        raise HTTPException(status_code=400, detail="period deve ser today, 7d ou 30d")

    duracao = agora - inicio
    return inicio, agora, inicio - duracao, bucket


def _variacao(atual: float, anterior: float):
    if not anterior:
        return None
    return round((atual - anterior) / anterior * 100, 1)


# Converte started_at para o horário de Brasília (funciona com
# coluna timestamp ou timestamptz).
LOCAL_TS = f"(cs.started_at::timestamptz AT TIME ZONE '{TZ_NAME}')"

KPI_SQL = """
    SELECT
        COUNT(*)                                   AS sessions,
        COUNT(*) FILTER (WHERE cs.status = 'cancelled') AS cancelled,
        COALESCE(SUM(cs.energy_used_kwh), 0)       AS energy_kwh,
        COALESCE(SUM(cs.total_cost), 0)            AS revenue,
        COUNT(DISTINCT cs.customer_id)             AS active_users,
        COALESCE(AVG(cs.duration_minutes), 0)      AS avg_duration_min
    FROM charge_sessions cs
    WHERE cs.started_at >= %s AND cs.started_at < %s
"""


def _kpis(cursor, inicio, fim):
    cursor.execute(KPI_SQL, (inicio, fim))
    r = cursor.fetchone()
    return {k: float(v or 0) for k, v in r.items()}


# ── Dashboard ───────────────────────────────────────────────────────

@router.get("/dashboard", dependencies=[Depends(require_admin)])
def admin_dashboard(period: str = Query("today")):
    inicio, fim, inicio_ant, bucket = _periodo(period)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        atual = _kpis(cursor, inicio, fim)
        anterior = _kpis(cursor, inicio_ant, inicio)

        kpis = {
            key: {
                "value": atual[key],
                "previous": anterior[key],
                "change_pct": _variacao(atual[key], anterior[key]),
            }
            for key in ("sessions", "energy_kwh", "revenue", "active_users", "avg_duration_min")
        }
        kpis["cancelled"] = {"value": atual["cancelled"]}

        # Série temporal (por hora hoje, por dia nos outros períodos)
        cursor.execute(
            f"""
            SELECT date_trunc(%s, {LOCAL_TS}) AS bucket,
                   COUNT(*) AS sessions,
                   COALESCE(SUM(cs.energy_used_kwh), 0) AS energy_kwh,
                   COALESCE(SUM(cs.total_cost), 0) AS revenue
            FROM charge_sessions cs
            WHERE cs.started_at >= %s AND cs.started_at < %s
            GROUP BY 1
            """,
            (bucket, inicio, fim),
        )
        por_bucket = {r["bucket"]: r for r in cursor.fetchall()}

        series = []
        passo = timedelta(hours=1) if bucket == "hour" else timedelta(days=1)
        cursor_t = inicio.replace(tzinfo=None)
        fim_local = fim.replace(tzinfo=None)
        while cursor_t <= fim_local:
            r = por_bucket.get(cursor_t)
            series.append({
                "label": cursor_t.strftime("%Hh") if bucket == "hour" else cursor_t.strftime("%d/%m"),
                "timestamp": cursor_t.isoformat(),
                "sessions": int(r["sessions"]) if r else 0,
                "energy_kwh": float(r["energy_kwh"]) if r else 0.0,
                "revenue": float(r["revenue"]) if r else 0.0,
            })
            cursor_t += passo

        # Horário de pico (hora com mais sessões no período)
        cursor.execute(
            f"""
            SELECT EXTRACT(HOUR FROM {LOCAL_TS})::int AS hour, COUNT(*) AS sessions
            FROM charge_sessions cs
            WHERE cs.started_at >= %s AND cs.started_at < %s
            GROUP BY 1 ORDER BY 2 DESC LIMIT 1
            """,
            (inicio, fim),
        )
        pico = cursor.fetchone()
        peak_hour = int(pico["hour"]) if pico else None

        # Uso por estação
        cursor.execute(
            """
            SELECT s.code AS station_code,
                   COUNT(cs.id) AS sessions,
                   COALESCE(SUM(cs.energy_used_kwh), 0) AS energy_kwh,
                   COALESCE(SUM(cs.total_cost), 0) AS revenue
            FROM charge_sessions cs
            JOIN stations s ON s.id = cs.station_id
            WHERE cs.started_at >= %s AND cs.started_at < %s
            GROUP BY s.code
            ORDER BY sessions DESC
            LIMIT 6
            """,
            (inicio, fim),
        )
        by_station = [
            {
                "station_code": r["station_code"],
                "sessions": int(r["sessions"]),
                "energy_kwh": float(r["energy_kwh"]),
                "revenue": float(r["revenue"]),
            }
            for r in cursor.fetchall()
        ]

        # Status atual das estações
        cursor.execute("SELECT status, COUNT(*) AS total FROM stations GROUP BY status")
        station_status = {r["status"]: int(r["total"]) for r in cursor.fetchall()}

        # Sessões do período (tabela + exportação CSV)
        cursor.execute(
            """
            SELECT cs.id, c.first_name, c.last_name, v.model,
                   s.code AS station_code, cs.start_battery_pct, cs.end_battery_pct,
                   cs.energy_used_kwh, cs.cost_per_kwh, cs.total_cost,
                   cs.started_at, cs.ended_at, cs.duration_minutes, cs.status
            FROM charge_sessions cs
            JOIN customers c ON c.id = cs.customer_id
            JOIN vehicles v ON v.id = cs.vehicle_id
            JOIN stations s ON s.id = cs.station_id
            WHERE cs.started_at >= %s AND cs.started_at < %s
            ORDER BY cs.started_at DESC
            LIMIT 500
            """,
            (inicio, fim),
        )
        sessions = cursor.fetchall()

        return {
            "period": period,
            "range": {"start": inicio.isoformat(), "end": fim.isoformat()},
            "generated_at": datetime.now(TZ).isoformat(),
            "kpis": kpis,
            "series": series,
            "peak_hour": peak_hour,
            "by_station": by_station,
            "station_status": station_status,
            "sessions": sessions,
        }

    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail=f"Erro ao montar dashboard: {erro}")
    finally:
        cursor.close()
        conn.close()


# ── Veículos (o front já chamava esta rota, mas ela não existia) ───

@router.get("/vehicles", dependencies=[Depends(require_admin)])
def admin_vehicles():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, customer_id, model, battery_capacity_kwh,
                   max_charge_power_kw AS max_power_kw
            FROM vehicles
            ORDER BY id DESC
            """
        )
        return cursor.fetchall()
    except Exception as erro:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar veículos: {erro}")
    finally:
        cursor.close()
        conn.close()

@router.get("/insights", dependencies=[Depends(require_admin)])
def get_operational_insights():

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Busca sessões
        cur.execute("""
            SELECT
                id,
                station_id,
                energy_used_kwh,
                total_cost,
                started_at,
                status
            FROM charge_sessions
            ORDER BY started_at DESC
        """)

        session_rows = cur.fetchall()

        sessions = []

        for row in session_rows:
            sessions.append({
        "id": row["id"],
        "station_id": row["station_id"],
        "energy_used_kwh": row["energy_used_kwh"],
        "total_cost": row["total_cost"],
        "started_at": row["started_at"],
        "status": row["status"],
    })

        # Busca estações
        cur.execute("""
            SELECT
                id,
                name,
                status,
                max_power_kw
            FROM stations
            ORDER BY id
        """)

        station_rows = cur.fetchall()

        stations = []

        for row in station_rows:
            stations.append({
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "max_power_kw": row["max_power_kw"],
    })

        # Gera os insights
        insights = generate_operational_insights(
            sessions,
            stations
        )

        return insights

    finally:
        cur.close()
        conn.close()


@router.get("/finance", dependencies=[Depends(require_admin)])
def admin_finance():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Resumo geral dos pagamentos
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE status = 'approved'
                ) AS approved_payments,

                COUNT(*) FILTER (
                    WHERE status = 'pending'
                ) AS pending_payments,

                COUNT(*) FILTER (
                    WHERE status = 'failed'
                ) AS failed_payments,

                COALESCE(
                    SUM(amount) FILTER (
                        WHERE status = 'approved'
                    ), 0
                ) AS total_revenue

            FROM payments
            """
        )

        summary = cursor.fetchone()

        # 2. Receita de carregamentos por método
        cursor.execute(
            """
            SELECT
                payment_method,
                COUNT(*) AS payments,
                COALESCE(SUM(amount), 0) AS revenue

            FROM payments

            WHERE status = 'approved'

            GROUP BY payment_method
            ORDER BY revenue DESC
            """
        )

        methods = cursor.fetchall()

        # 3. Indicadores financeiros do Cartão Grid
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(amount) FILTER (
                    WHERE type = 'topup'
                      AND bucket = 'paid'
                      AND amount > 0
                ), 0) AS total_topups,

                COALESCE(SUM(amount) FILTER (
                    WHERE type = 'topup_bonus'
                      AND bucket = 'bonus'
                      AND amount > 0
                ), 0) AS total_topup_bonus,

                COALESCE(SUM(amount) FILTER (
                    WHERE type = 'cashback'
                      AND bucket = 'bonus'
                      AND amount > 0
                ), 0) AS total_cashback,

                COALESCE(SUM(amount) FILTER (
                    WHERE bucket = 'paid'
                ), 0) AS paid_balance,


                COALESCE(SUM(remaining_amount) FILTER (
                    WHERE bucket = 'bonus'
                    AND amount > 0
                    AND expires_at > NOW()
                ), 0) AS bonus_balance


            FROM public.wallet_transactions
            """
        )

        wallet_summary = cursor.fetchone()

        # 4. Últimos 50 pagamentos
        cursor.execute(
            """
            SELECT
                p.id,
                p.session_id,
                p.customer_id,
                p.amount,
                p.payment_method,
                p.status,
                p.created_at,
                p.paid_at

            FROM payments p

            ORDER BY p.created_at DESC
            LIMIT 50
            """
        )

        recent_payments = cursor.fetchall()

        # 5. Resposta completa para o painel operador
        return {
            "summary": {
                "total_revenue": float(
                    summary["total_revenue"] or 0
                ),
                "approved_payments": int(
                    summary["approved_payments"]
                ),
                "pending_payments": int(
                    summary["pending_payments"]
                ),
                "failed_payments": int(
                    summary["failed_payments"]
                ),
            },

            "methods": [
                {
                    "method": row["payment_method"],
                    "payments": int(row["payments"]),
                    "revenue": float(row["revenue"] or 0),
                }
                for row in methods
            ],

            "wallet": {
                "total_topups": float(
                    wallet_summary["total_topups"]
                ),
                "total_topup_bonus": float(
                    wallet_summary["total_topup_bonus"]
                ),
                "total_cashback": float(
                    wallet_summary["total_cashback"]
                ),
                "paid_balance": float(
                    wallet_summary["paid_balance"]
                ),
                "bonus_balance": float(
                    wallet_summary["bonus_balance"]
                ),
            },

            "recent_payments": [
                {
                    "id": row["id"],
                    "session_id": row["session_id"],
                    "customer_id": row["customer_id"],
                    "amount": float(row["amount"]),
                    "payment_method": row["payment_method"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "paid_at": row["paid_at"],
                }
                for row in recent_payments
            ],
        }

    except Exception as erro:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao carregar financeiro: {erro}"
        )

    finally:
        cursor.close()
        conn.close()
