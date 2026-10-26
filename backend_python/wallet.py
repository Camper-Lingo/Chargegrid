
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Literal

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field

from database import get_connection

import os
import json

from uuid import UUID
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from dotenv import load_dotenv

load_dotenv()



# ── Regras do programa ──────────────────────────────────────────────

TIER_WINDOW_DAYS = 30
BONUS_VALIDITY_DAYS = 90

TOPUP_MIN = Decimal("10")
TOPUP_MAX = Decimal("1000")

# Ordem: do menor para o maior
TIERS = [
    {
        "key": "bronze",
        "name": "Bronze",
        "min_kwh": 0,
        "cashback_pct": 2,
        "bonus_multiplier": Decimal("1.00"),
    },
    {
        "key": "prata",
        "name": "Prata",
        "min_kwh": 50,
        "cashback_pct": 4,
        "bonus_multiplier": Decimal("1.25"),
    },
    {
        "key": "ouro",
        "name": "Ouro",
        "min_kwh": 150,
        "cashback_pct": 6,
        "bonus_multiplier": Decimal("1.50"),
    },
]

# (valor mínimo da recarga, bônus base) — do maior para o menor
TOPUP_BONUS_BANDS = [
    (Decimal("200"), Decimal("12.00")),
    (Decimal("100"), Decimal("5.00")),
    (Decimal("50"), Decimal("2.00")),
]

CENT = Decimal("0.01")


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


def brl(value) -> str:
    """Formata no padrão brasileiro: R$ 1.234,56"""
    text = f"{money(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {text}"


class InsufficientBalance(Exception):
    def __init__(self, available: Decimal, required: Decimal):
        self.available = available
        self.required = required
        super().__init__("Saldo insuficiente")


# ── Nível ───────────────────────────────────────────────────────────

def tier_for_kwh(kwh: float) -> dict:
    current = TIERS[0]
    for tier in TIERS:
        if kwh >= tier["min_kwh"]:
            current = tier
    return current


def next_tier(tier: dict) -> dict | None:
    index = TIERS.index(tier)
    return TIERS[index + 1] if index + 1 < len(TIERS) else None


def kwh_last_30_days(cursor, customer_id: int) -> float:
    cursor.execute(
        """
        SELECT COALESCE(SUM(energy_used_kwh), 0) AS kwh
        FROM charge_sessions
        WHERE customer_id = %s
          AND started_at >= NOW() - (%s || ' days')::interval
        """,
        (customer_id, str(TIER_WINDOW_DAYS)),
    )
    return float(cursor.fetchone()["kwh"] or 0)


def tier_info(cursor, customer_id: int) -> dict:
    kwh = kwh_last_30_days(cursor, customer_id)
    tier = tier_for_kwh(kwh)
    upcoming = next_tier(tier)

    if upcoming:
        span = upcoming["min_kwh"] - tier["min_kwh"]
        progress = (kwh - tier["min_kwh"]) / span * 100 if span else 100
        next_info = {
            "key": upcoming["key"],
            "name": upcoming["name"],
            "min_kwh": upcoming["min_kwh"],
            "missing_kwh": round(max(0.0, upcoming["min_kwh"] - kwh), 1),
        }
    else:
        progress = 100
        next_info = None

    return {
        "key": tier["key"],
        "name": tier["name"],
        "cashback_pct": tier["cashback_pct"],
        "bonus_multiplier": float(tier["bonus_multiplier"]),
        "kwh_30d": round(kwh, 1),
        "progress_pct": round(min(100.0, max(0.0, progress)), 1),
        "next_tier": next_info,
    }


def _tier_by_key(key: str) -> dict:
    return next(t for t in TIERS if t["key"] == key)


# ── Cálculos ────────────────────────────────────────────────────────

def calc_topup_bonus(amount, tier_key: str) -> Decimal:
    amount = money(amount)
    tier = _tier_by_key(tier_key)

    for minimum, base_bonus in TOPUP_BONUS_BANDS:
        if amount >= minimum:
            return money(base_bonus * tier["bonus_multiplier"])

    return Decimal("0.00")


def calc_cashback(total_cost, tier_key: str) -> Decimal:
    tier = _tier_by_key(tier_key)
    return money(money(total_cost) * Decimal(tier["cashback_pct"]) / 100)


# ── Saldo ───────────────────────────────────────────────────────────

def balances(cursor, customer_id: int) -> dict:
    cursor.execute(
        """
        SELECT
            COALESCE(SUM(amount) FILTER (WHERE bucket = 'paid'), 0)
                AS paid,
            COALESCE(SUM(remaining_amount) FILTER (
                WHERE bucket = 'bonus' AND amount > 0
                  AND expires_at > NOW()
            ), 0) AS bonus,
            COALESCE(SUM(remaining_amount) FILTER (
                WHERE bucket = 'bonus' AND amount > 0
                  AND expires_at > NOW()
                  AND expires_at <= NOW() + INTERVAL '7 days'
            ), 0) AS bonus_expiring_7d
        FROM wallet_transactions
        WHERE customer_id = %s
        """,
        (customer_id,),
    )
    row = cursor.fetchone()
    paid = money(row["paid"])
    bonus = money(row["bonus"])

    return {
        "paid": paid,
        "bonus": bonus,
        "total": paid + bonus,
        "bonus_expiring_7d": money(row["bonus_expiring_7d"]),
    }


def balances_json(values: dict) -> dict:
    return {key: float(value) for key, value in values.items()}


def lock_customer(cursor, customer_id: int) -> dict:
    """Trava o cliente durante a transação para evitar gasto em dobro."""
    cursor.execute(
        """
        SELECT id, first_name, last_name, auth_user_id
        FROM customers
        WHERE id = %s
        FOR UPDATE
        """,
        (customer_id,),
    )
    customer = cursor.fetchone()

    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    return customer


def credit_bonus(
    cursor,
    customer_id: int,
    tx_type: str,
    amount: Decimal,
    tier_key: str,
    description: str,
    session_id: int | None = None,
):
    if amount <= 0:
        return

    cursor.execute(
        """
        INSERT INTO wallet_transactions (
            customer_id, type, bucket, amount, remaining_amount,
            session_id, tier, description, expires_at
        )
        VALUES (
            %s, %s, 'bonus', %s, %s,
            %s, %s, %s, NOW() + (%s || ' days')::interval
        )
        """,
        (
            customer_id, tx_type, amount, amount,
            session_id, tier_key, description, str(BONUS_VALIDITY_DAYS),
        ),
    )


def debit_for_session(
    cursor,
    customer_id: int,
    session_id: int,
    amount: Decimal,
    tier_key: str,
) -> dict:
    """
    Paga uma recarga com o saldo. Usa primeiro o bônus que vence antes,
    depois o saldo pago. Precisa ser chamado depois de lock_customer().
    """
    amount = money(amount)
    current = balances(cursor, customer_id)

    if current["total"] < amount:
        raise InsufficientBalance(current["total"], amount)

    # 1. Consome os créditos de bônus (FIFO pela data de expiração)
    cursor.execute(
        """
        SELECT id, remaining_amount
        FROM wallet_transactions
        WHERE customer_id = %s
          AND bucket = 'bonus'
          AND amount > 0
          AND remaining_amount > 0
          AND expires_at > NOW()
        ORDER BY expires_at ASC, id ASC
        FOR UPDATE
        """,
        (customer_id,),
    )
    lots = cursor.fetchall()

    left = amount
    used_bonus = Decimal("0.00")

    for lot in lots:
        if left <= 0:
            break

        take = min(money(lot["remaining_amount"]), left)

        cursor.execute(
            """
            UPDATE wallet_transactions
            SET remaining_amount = remaining_amount - %s
            WHERE id = %s
            """,
            (take, lot["id"]),
        )

        used_bonus += take
        left -= take

    used_paid = left

    # 2. Registra os débitos no extrato
    if used_bonus > 0:
        cursor.execute(
            """
            INSERT INTO wallet_transactions (
                customer_id, type, bucket, amount, session_id, tier, description
            )
            VALUES (%s, 'charge_payment', 'bonus', %s, %s, %s, %s)
            """,
            (
                customer_id, -used_bonus, session_id, tier_key,
                f"Recarga #{session_id} (saldo bônus)",
            ),
        )

    if used_paid > 0:
        cursor.execute(
            """
            INSERT INTO wallet_transactions (
                customer_id, type, bucket, amount, session_id, tier, description
            )
            VALUES (%s, 'charge_payment', 'paid', %s, %s, %s, %s)
            """,
            (
                customer_id, -used_paid, session_id, tier_key,
                f"Recarga #{session_id}",
            ),
        )

    return {"used_bonus": used_bonus, "used_paid": used_paid}


def is_loyalty_member(customer: dict) -> bool:
    """GridBack e nível só para quem tem conta no app (visitante não ganha)."""
    return bool(customer.get("auth_user_id"))


# ── Rotas ───────────────────────────────────────────────────────────


def get_authenticated_user_id(
    authorization: str | None = Header(default=None)
) -> str:
    """
    Valida o token com o Supabase Auth
    e retorna o ID do usuário autenticado.
    """

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Login necessário."
        )

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Token não informado."
        )

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=503,
            detail="Autenticação do Supabase não configurada."
        )

    request = Request(
        f"{supabase_url.rstrip('/')}/auth/v1/user",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=8) as response:
            user_data = json.load(response)

    except HTTPError as err:
        if err.code in (401, 403):
            raise HTTPException(
                status_code=401,
                detail="Login inválido ou expirado."
            )

        raise HTTPException(
            status_code=503,
            detail="Falha ao validar login."
        )

    except (URLError, TimeoutError):
        raise HTTPException(
            status_code=503,
            detail="Serviço de autenticação indisponível."
        )

    user_id = user_data.get("id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Usuário não identificado."
        )

    return str(user_id)


router = APIRouter(tags=["cartao-grid"])


@router.get("/api/wallet/rules")
def wallet_rules():
    return {
        "tier_window_days": TIER_WINDOW_DAYS,
        "bonus_validity_days": BONUS_VALIDITY_DAYS,
        "topup_min": float(TOPUP_MIN),
        "topup_max": float(TOPUP_MAX),
        "tiers": [
            {
                "key": t["key"],
                "name": t["name"],
                "min_kwh": t["min_kwh"],
                "cashback_pct": t["cashback_pct"],
                "bonus_multiplier": float(t["bonus_multiplier"]),
            }
            for t in TIERS
        ],
        "topup_bonus_bands": [
            {
                "min_amount": float(minimum),
                "base_bonus": float(bonus),
                "bonus_by_tier": {
                    t["key"]: float(calc_topup_bonus(minimum, t["key"]))
                    for t in TIERS
                },
            }
            for minimum, bonus in sorted(TOPUP_BONUS_BANDS)
        ],
    }


def _wallet_summary(cursor, customer_id: int) -> dict:
    cursor.execute(
        "SELECT id, first_name, last_name, auth_user_id FROM customers WHERE id = %s",
        (customer_id,),
    )
    customer = cursor.fetchone()

    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    cursor.execute(
        """
        SELECT
            id, type, bucket, amount, payment_method,
            session_id, tier, description, expires_at, created_at
        FROM wallet_transactions
        WHERE customer_id = %s
        ORDER BY created_at DESC, id DESC
        LIMIT 30
        """,
        (customer_id,),
    )
    transactions = [
        {**row, "amount": float(row["amount"])}
        for row in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'cashback'), 0) AS cashback,
            COALESCE(SUM(amount) FILTER (WHERE type = 'topup_bonus'), 0) AS topup_bonus
        FROM wallet_transactions
        WHERE customer_id = %s
        """,
        (customer_id,),
    )
    earned = cursor.fetchone()

    return {
        "customer_id": customer["id"],
        "first_name": customer["first_name"],
        "last_name": customer["last_name"],
        "loyalty_member": is_loyalty_member(customer),
        "balance": balances_json(balances(cursor, customer_id)),
        "tier": tier_info(cursor, customer_id),
        "earned": {
            "gridback": float(earned["cashback"]),
            "topup_bonus": float(earned["topup_bonus"]),
        },
        "transactions": transactions,
    }


@router.get("/api/wallet/{customer_id}")
def get_wallet(customer_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        return _wallet_summary(cursor, customer_id)
    finally:
        cursor.close()
        conn.close()



class TopupRequest(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    payment_method: Literal["credit", "debit", "pix"]
    idempotency_key: UUID


METHOD_LABELS = {
    "credit": "cartão de crédito",
    "debit": "cartão de débito",
    "pix": "Pix",
}


@router.post("/api/wallet/{customer_id}/topup", status_code=201)
def topup_wallet(
    customer_id: int,
    data: TopupRequest,
    auth_user_id: str = Depends(get_authenticated_user_id),
):
    amount = money(data.amount)

    if not TOPUP_MIN <= amount <= TOPUP_MAX:
        raise HTTPException(
            status_code=400,
            detail=(
                f"A recarga deve ser entre "
                f"{brl(TOPUP_MIN)} e {brl(TOPUP_MAX)}."
            ),
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Bloqueia operações simultâneas do mesmo cliente.
        customer = lock_customer(cursor, customer_id)

        # 2. Confere se o usuário logado é dono da carteira.
        if (
            not customer.get("auth_user_id")
            or str(customer["auth_user_id"]) != auth_user_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Esta carteira não pertence à sua conta."
            )

        request_key = str(data.idempotency_key)

        # 3. Verifica se este pedido já foi processado.
        cursor.execute(
            """
            SELECT id, amount, payment_method, tier
            FROM wallet_transactions
            WHERE customer_id = %s
              AND type = 'topup'
              AND idempotency_key = %s
            FOR UPDATE
            """,
            (customer_id, request_key),
        )

        previous = cursor.fetchone()

        if previous:
            # A mesma chave não pode representar outra compra.
            if (
                money(previous["amount"]) != amount
                or previous["payment_method"] != data.payment_method
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Esta chave já foi usada em outra operação."
                )

            original_tier = _tier_by_key(previous["tier"])

            result = {
                "already_processed": True,
                "credited": float(previous["amount"]),
                "bonus": float(
                    calc_topup_bonus(
                        previous["amount"],
                        previous["tier"]
                    )
                ),
                "tier": original_tier["name"],
                "wallet": _wallet_summary(cursor, customer_id),
            }

            conn.commit()
            return result

        # 4. Calcula o nível e o bônus da nova recarga.
        tier = tier_info(cursor, customer_id)

        bonus = calc_topup_bonus(
            amount,
            tier["key"]
        )

        # 5. Registra os créditos simulados.
        cursor.execute(
            """
            INSERT INTO wallet_transactions (
                customer_id,
                type,
                bucket,
                amount,
                payment_method,
                tier,
                description,
                idempotency_key
            )
            VALUES (
                %s,
                'topup',
                'paid',
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                customer_id,
                amount,
                data.payment_method,
                tier["key"],
                f"Recarga simulada via {METHOD_LABELS[data.payment_method]}",
                request_key,
            ),
        )

        # 6. Credita o bônus correspondente ao nível.
        credit_bonus(
            cursor,
            customer_id,
            "topup_bonus",
            bonus,
            tier["key"],
            f"Bônus de recarga - nível {tier['name']}",
        )

        # 7. Confirma crédito e bônus juntos.
        conn.commit()

        return {
            "already_processed": False,
            "credited": float(amount),
            "bonus": float(bonus),
            "tier": tier["name"],
            "wallet": _wallet_summary(cursor, customer_id),
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as erro:
        conn.rollback()
        print("Erro interno ao recarregar saldo:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao processar recarga de saldo."
        )

    finally:
        cursor.close()
        conn.close()
