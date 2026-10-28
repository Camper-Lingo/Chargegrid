from fastapi import FastAPI, HTTPException, Request, Header
import secrets
from pydantic import BaseModel, Field
from wallet import router as wallet_router
import json
from uuid import UUID, uuid4
import math
from rag.api import router as rag_router

from wallet import (
    InsufficientBalance,
    balances,
    brl,
    calc_cashback,
    credit_bonus,
    debit_for_session,
    is_loyalty_member,
    lock_customer,
    money,
    tier_info,
)

from mqtt_bridge import publish_hardware_state
from typing import Literal
from threading import Lock
import string
from database import get_connection
from schemas import ChargeSessionCreate, CustomerCreate, VehicleCreate,ChargingCalculationRequest
from fastapi.middleware.cors import CORSMiddleware
from admin import router as admin_router
from datetime import datetime
from tariff import (
    obter_info_tarifa,
    calcular_carga_por_energia
)
from demand_control import calculate_demand

app = FastAPI(title="GoodWe Charging API")
app.include_router(rag_router)
app.include_router(wallet_router)
app.include_router(admin_router)
demand_config = {
    "installation_limit_kw": 300.0,
    "building_consumption_kw": 270.0,
}



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_connection_code():
    alphabet = string.ascii_uppercase + string.digits

    return ''.join(
        secrets.choice(alphabet)
        for _ in range(6)
    )


@app.get("/api/tariff")
def get_current_tariff():

    agora = datetime.now()

    taxa, proxima_mudanca, nome = obter_info_tarifa(agora)

    return {
        "rate": taxa,
        "name": nome,
        "current_time": agora.isoformat(),
        "next_change": proxima_mudanca.isoformat()
    }

@app.get("/api/test")
def test_connection():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT NOW() AS hora_do_banco")
    resultado = cursor.fetchone()
    cursor.close()
    conn.close()
    return {"message": "Conectado!", "dados": resultado}


@app.post("/api/sessions", status_code=201)
def create_session(session: ChargeSessionCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO charge_sessions
                (customer_id, vehicle_id, station_id, start_battery_pct,
                 end_battery_pct, energy_used_kwh, cost_per_kwh, total_cost,
                 started_at, ended_at, duration_minutes, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                session.customer_id, session.vehicle_id, session.station_id,
                session.start_battery_pct, session.end_battery_pct,
                session.energy_used_kwh, session.cost_per_kwh, session.total_cost,
                session.started_at, session.ended_at,
                session.duration_minutes, session.status
            )
        )
        novo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"session_id": novo_id}

    except Exception as erro:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar sessão: {erro}")

    finally:
        cursor.close()
        conn.close()


@app.post("/api/customers", status_code=201)
def create_customer(customer: CustomerCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Gera um código de conexão único
        while True:
            connection_code = generate_connection_code()

            cursor.execute(
                """
                SELECT id
                FROM customers
                WHERE connection_code = %s
                """,
                (connection_code,)
            )

            if cursor.fetchone() is None:
                break

        cursor.execute(
            """
            INSERT INTO customers (
                first_name,
                last_name,
                connection_code
            )
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (
                customer.first_name,
                customer.last_name,
                connection_code
            )
        )

        novo_id = cursor.fetchone()["id"]

        conn.commit()

        return {
            "customer_id": novo_id,
            "connection_code": connection_code
        }

    except Exception as erro:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar cliente: {erro}"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/api/vehicles", status_code=201)
def create_vehicle(vehicle: VehicleCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO vehicles (
                customer_id,
                model,
                battery_capacity_kwh,
                current_battery_pct,
                max_charge_power_kw,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, TRUE)
            RETURNING id
            """,
            (
                vehicle.customer_id,
                vehicle.model,
                vehicle.battery_capacity_kwh,
                vehicle.current_battery_pct,
                vehicle.max_charge_power_kw,
            )
        )

        novo_id = cursor.fetchone()["id"]

        conn.commit()

        return {
            "vehicle_id": novo_id
        }

    except Exception as erro:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar veiculo: {erro}"
        )

    finally:
        cursor.close()
        conn.close()
@app.get("/api/stations")
def list_stations():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                code,
                name,
                address,
                latitude,
                longitude,
                max_power_kw,
                status
            FROM stations
            ORDER BY id
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


@app.post("/api/stations/occupy-random")
def occupy_random_station():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Recupera reservas expiradas.
        # Reservas antigas sem token não são alteradas.
        cursor.execute("""
            UPDATE stations
            SET
                status = 'available',
                reservation_token = NULL,
                reservation_expires_at = NULL
            WHERE status = 'occupied'
              AND reservation_token IS NOT NULL
              AND reservation_expires_at < NOW()
        """)

        # Sorteia uma estação disponível.
        # SKIP LOCKED evita disputar uma linha já
        # selecionada por outra transação.
        cursor.execute("""
            SELECT
                id,
                code,
                name,
                address,
                latitude,
                longitude,
                max_power_kw,
                status
            FROM stations
            WHERE status = 'available'
            ORDER BY RANDOM()
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        """)

        station = cursor.fetchone()

        if not station:
            raise HTTPException(
                status_code=409,
                detail="Nenhuma estação disponível"
            )

        # Identificador único desta reserva.
        token = str(uuid4())

        cursor.execute("""
            UPDATE stations
            SET
                status = 'occupied',
                reservation_token = %s::uuid,
                reservation_expires_at =
                    NOW() + INTERVAL '5 minutes'
            WHERE id = %s
            RETURNING reservation_expires_at
        """, (token, station["id"]))

        reservation = cursor.fetchone()

        conn.commit()

        return {
            **station,
            "status": "occupied",
            "reservation_token": token,
            "reservation_expires_at": (
                reservation["reservation_expires_at"]
            ),
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao reservar estação"
        )

    finally:
        cursor.close()
        conn.close()


class StationReservationRequest(BaseModel):
    reservation_token: UUID


@app.post("/api/stations/{station_id}/heartbeat")
def renew_station_reservation(
    station_id: int,
    data: StationReservationRequest
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE stations
            SET reservation_expires_at =
                NOW() + INTERVAL '5 minutes'
            WHERE id = %s
              AND status = 'occupied'
              AND reservation_token = %s::uuid
              AND reservation_expires_at > NOW()
            RETURNING
                id,
                reservation_expires_at
        """, (
            station_id,
            str(data.reservation_token)
        ))

        station = cursor.fetchone()

        if not station:
            raise HTTPException(
                status_code=409,
                detail="Reserva inexistente ou expirada"
            )

        conn.commit()

        return {
            "station_id": station_id,
            "status": "occupied",
            "reservation_expires_at": (
                station["reservation_expires_at"]
            ),
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao renovar reserva"
        )

    finally:
        cursor.close()
        conn.close()





@app.post("/api/stations/{station_id}/release")
def release_station(
    station_id: int,
    data: StationReservationRequest
):
    token = str(data.reservation_token)

    conn = get_connection()


    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE stations
            SET
                status = 'available',
                reservation_token = NULL,
                reservation_expires_at = NULL
            WHERE id = %s
              AND status = 'occupied'
              AND reservation_token = %s::uuid
            RETURNING id
        """, (station_id, token))

        station = cursor.fetchone()

        if not station:
            raise HTTPException(
                status_code=409,
                detail="Reserva não encontrada ou já liberada"
            )

        conn.commit()

        return {
            "station_id": station_id,
            "status": "available"
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao liberar estação"
        )

    finally:
        cursor.close()
        conn.close()


@app.get("/api/demand")
def get_demand_status():
    conn = get_connection()
    cursor = conn.cursor()


    # Busca a configuração persistida no Supabase,
    # independentemente de haver estações ocupadas.
    cursor.execute(
        """
        SELECT
            installation_limit_kw,
            building_consumption_kw
        FROM public.demand_settings
        WHERE id = 1
        """
    )

    config_row = cursor.fetchone()

    if config_row is None:
        raise ValueError(
            "Configuração de demanda não encontrada."
        )

    demand_config["installation_limit_kw"] = float(
        config_row["installation_limit_kw"]
    )

    demand_config["building_consumption_kw"] = float(
        config_row["building_consumption_kw"]
    )


    try:
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(max_power_kw), 0)
                AS requested_kw
            FROM stations
            WHERE status = 'occupied'
            """
        )

        row = cursor.fetchone()

        ev_requested_kw = float(
            row["requested_kw"] or 0
        )

        result = calculate_demand(
            demand_config["installation_limit_kw"],
            demand_config["building_consumption_kw"],
            ev_requested_kw
        )

        return {
            "installation_limit_kw":
                result.installation_limit_kw,

            "building_consumption_kw":
                result.building_consumption_kw,

            "available_for_evs_kw":
                result.available_for_evs_kw,

            "ev_requested_kw":
                result.ev_requested_kw,

            "ev_allowed_kw":
                result.ev_allowed_kw,

            "total_requested_kw":
                result.total_requested_kw,

            "projected_total_kw":
                result.projected_total_kw,

            "utilization_pct":
                result.utilization_pct,

            "limited":
                result.limited,

            "reduction_kw":
                result.reduction_kw,

            "reduction_pct":
                result.reduction_pct,
        }

    except Exception as erro:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no controle de demanda: {erro}"
        )

    finally:
        cursor.close()
        conn.close()


@app.put("/api/demand/config")
def update_demand_config(
    installation_limit_kw: float,
    building_consumption_kw: float
):
    if (
        not math.isfinite(installation_limit_kw)
        or installation_limit_kw <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="O limite deve ser um número maior que zero"
        )

    if (
        not math.isfinite(building_consumption_kw)
        or building_consumption_kw < 0
    ):
        raise HTTPException(
            status_code=400,
            detail="O consumo deve ser um número maior ou igual a zero"
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO public.demand_settings (
                id,
                installation_limit_kw,
                building_consumption_kw,
                updated_at
            )
            VALUES (1, %s, %s, NOW())

            ON CONFLICT (id)
            DO UPDATE SET
                installation_limit_kw =
                    EXCLUDED.installation_limit_kw,
                building_consumption_kw =
                    EXCLUDED.building_consumption_kw,
                updated_at = NOW()
            """,
            (
                installation_limit_kw,
                building_consumption_kw
            )
        )

        conn.commit()

        # Mantém o dicionário atual sincronizado
        # para não quebrar outras funções existentes.
        demand_config["installation_limit_kw"] = float(
            installation_limit_kw
        )

        demand_config["building_consumption_kw"] = float(
            building_consumption_kw
        )

        return {
            "message": "Configuração salva com sucesso",
            "installation_limit_kw":
                demand_config["installation_limit_kw"],
            "building_consumption_kw":
                demand_config["building_consumption_kw"]
        }

    except Exception as erro:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao salvar configuração: {erro}"
        )

    finally:
        cursor.close()
        conn.close()


@app.post("/api/charging/calculate")
def calculate_charging(data: ChargingCalculationRequest):

    print("\n===== CALCULO RECEBIDO =====")
    print("Energia necessária:", data.energy_needed_kwh)
    print("Potência:", data.power_kw)
    print("Horário:", data.start_time)

    resultado = calcular_carga_por_energia(
        data.energy_needed_kwh,
        data.power_kw,
        data.start_time
    )

    print("Resultado:", resultado)
    print("============================\n")

    return resultado

@app.get("/api/connect/{connection_code}")
def connect_by_code(connection_code: str):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Procura o cliente pelo código
        cursor.execute(
            """
            SELECT id, first_name, last_name
            FROM customers
            WHERE UPPER(connection_code) = UPPER(%s)
            """,
            (connection_code,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Código de conexão inválido"
            )

        # Procura o veículo ATIVO desse cliente
        cursor.execute(
            """
            SELECT
                id,
                customer_id,
                model,
                battery_capacity_kwh,
                current_battery_pct,
                max_charge_power_kw
            FROM vehicles
            WHERE customer_id = %s
              AND is_active = true
            LIMIT 1
            """,
            (customer["id"],)
        )

        vehicle = cursor.fetchone()

        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail="Nenhum veículo ativo encontrado para esta conta"
            )

        return {
            "customer_id": customer["id"],
            "first_name": customer["first_name"],
            "last_name": customer["last_name"],
            "vehicle": vehicle
        }

    except HTTPException:
        raise

    except Exception as erro:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao conectar conta: {erro}"
        )

    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/customers")
def admin_customers():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                first_name,
                last_name
            FROM customers
            ORDER BY id DESC
        """)

        return cursor.fetchall()

    except Exception as erro:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar clientes: {erro}"
        )

    finally:
        cursor.close()
        conn.close()


@app.post("/api/vehicles", status_code=201)
def create_vehicle(vehicle: VehicleCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO vehicles (
                customer_id,
                model,
                battery_capacity_kwh,
                current_battery_pct,
                max_charge_power_kw,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, TRUE)
            RETURNING id
            """,
            (
                vehicle.customer_id,
                vehicle.model,
                vehicle.battery_capacity_kwh,
                vehicle.current_battery_pct,
                vehicle.max_charge_power_kw,
            )
        )

        novo_id = cursor.fetchone()["id"]

        conn.commit()

        return {
            "vehicle_id": novo_id
        }

    except Exception as erro:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar veiculo: {erro}"
        )

    finally:
        cursor.close()
        conn.close()


@app.get("/api/admin/sessions")
def admin_sessions():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                cs.id,
                c.first_name,
                c.last_name,
                v.model,
                v.plate,
                s.code AS station_code,
                cs.start_battery_pct,
                cs.end_battery_pct,
                cs.energy_used_kwh,
                cs.cost_per_kwh,
                cs.total_cost,
                cs.started_at,
                cs.ended_at,
                cs.duration_minutes,
                cs.status
            FROM charge_sessions cs
            JOIN customers c ON c.id = cs.customer_id
            JOIN vehicles v ON v.id = cs.vehicle_id
            JOIN stations s ON s.id = cs.station_id
            ORDER BY cs.started_at DESC
        """)

        return cursor.fetchall()

    except Exception as erro:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar sessões: {erro}"
        )

    finally:
        cursor.close()
        conn.close()


@app.post("/api/payments")
def create_payment(
    session_id: int,
    customer_id: int,
    payment_method: str
):
    allowed_methods = {"pix", "card", "wallet"}

    if payment_method not in allowed_methods:
        raise HTTPException(
            status_code=400,
            detail="Método de pagamento inválido"
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Trava o cliente durante o pagamento.
        # Isso ajuda a impedir cobranças simultâneas.
        customer = lock_customer(cursor, customer_id)

        # Busca a sessão que será paga.
        cursor.execute(
            """
            SELECT id, customer_id, total_cost
            FROM charge_sessions
            WHERE id = %s
            """,
            (session_id,)
        )

        session = cursor.fetchone()

        if not session:
            raise HTTPException(
                status_code=404,
                detail="Sessão não encontrada"
            )

        if session["customer_id"] != customer_id:
            raise HTTPException(
                status_code=403,
                detail="Sessão não pertence ao cliente"
            )

        # Impede pagar novamente uma sessão já aprovada.
        cursor.execute(
            """
            SELECT id
            FROM payments
            WHERE session_id = %s
              AND status = 'approved'
            LIMIT 1
            """,
            (session_id,)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="Esta sessão já foi paga"
            )

        # O preço vem do banco, não do navegador.
        amount = money(session["total_cost"])

        if amount < 0:
            raise HTTPException(
                status_code=400,
                detail="Valor de sessão inválido"
            )

        # Calcula o nível atual do cliente.
        tier = tier_info(cursor, customer_id)

        wallet_usage = None

        # Pagamento utilizando o Cartão Grid.
        if payment_method == "wallet":
            try:
                wallet_usage = debit_for_session(
                    cursor,
                    customer_id,
                    session_id,
                    amount,
                    tier["key"]
                )

            except InsufficientBalance as falta:
                raise HTTPException(
                    status_code=402,
                    detail=(
                        f"Saldo insuficiente: você tem "
                        f"{brl(falta.available)} e a "
                        f"recarga custa {brl(falta.required)}."
                    )
                )

        # Registra o pagamento simulado.
        cursor.execute(
            """
            INSERT INTO payments (
                session_id,
                customer_id,
                amount,
                payment_method,
                status,
                paid_at
            )
            VALUES (%s, %s, %s, %s, 'approved', NOW())
            RETURNING
                id,
                session_id,
                customer_id,
                amount,
                payment_method,
                status,
                created_at,
                paid_at
            """,
            (
                session_id,
                customer_id,
                amount,
                payment_method
            )
        )

        payment = cursor.fetchone()

        # GridBack para clientes com conta cadastrada.
        # Visitantes não recebem cashback.
        gridback = 0.0

        if is_loyalty_member(customer):
            cashback_value = calc_cashback(
                amount,
                tier["key"]
            )

            credit_bonus(
                cursor,
                customer_id,
                "cashback",
                cashback_value,
                tier["key"],
                (
                    f"GridBack {tier['cashback_pct']}% "
                    f"- recarga #{session_id}"
                ),
                session_id=session_id,
            )

            gridback = float(cashback_value)

        # Consulta o saldo depois das movimentações.
        updated_balance = balances(cursor, customer_id)

        # Confirma tudo junto no banco.
        conn.commit()

        return {
            **payment,
            "loyalty": {
                "tier": tier["name"],
                "tier_key": tier["key"],
                "gridback_pct": tier["cashback_pct"],
                "gridback": gridback,
                "used_bonus": (
                    float(wallet_usage["used_bonus"])
                    if wallet_usage else 0.0
                ),
                "used_paid": (
                    float(wallet_usage["used_paid"])
                    if wallet_usage else 0.0
                ),
                "wallet_balance": float(
                    updated_balance["total"]
                ),
            },
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as erro:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar pagamento: {erro}"
        )

    finally:
        cursor.close()
        conn.close()






# ============================================
# CHARGEGRID - INTEGRACAO COM ESP32
# ============================================

class HardwareState(BaseModel):
    status: Literal[
        "waiting",
        "connected",
        "charging",
        "payment",
        "paid"
    ] = "waiting"

    customer_name: str = ""
    vehicle_model: str = ""
    station_code: str = ""

    battery_pct: float = Field(default=0, ge=0, le=100)
    power_kw: float = Field(default=0, ge=0)
    energy_kwh: float = Field(default=0, ge=0)
    cost_brl: float = Field(default=0, ge=0)


hardware_states = {}
hardware_lock = Lock()


def default_hardware_state():
    return {
        **HardwareState().model_dump(),
        "stop_requested": False
    }


# ESP32 CONSULTA O ESTADO
@app.get("/api/hardware/{station_id}/state")
def get_hardware_state(station_id: int):
    with hardware_lock:
        return hardware_states.get(
            station_id,
            default_hardware_state()
        ).copy()


# PAINEL ENVIA AS INFORMACOES AO ESP32

@app.post("/api/hardware/{station_id}/sync")
def sync_hardware_state(
    station_id: int,
    data: HardwareState
):
    with hardware_lock:
        previous = hardware_states.get(
            station_id,
            default_hardware_state()
        )
        # Impede telemetria atrasada de reabrir uma recarga encerrada
        if (
            previous["status"] in ("payment", "paid")
            and data.status == "charging"
        ):
            return {
                **previous,
                "mqtt_sent": False,
                "ignored": True
            }

        hardware_states[station_id] = {
            **data.model_dump(),
            "stop_requested": (
                previous["stop_requested"]
                if data.status == "charging"
                else False
            )
        }

        state = hardware_states[station_id].copy()

    # O prototipo ESP32 utiliza o canal 1.
    # Publica fora do lock para nao bloquear outras consultas.
    if station_id == 1:
        try:
            publish_hardware_state(state)
            return {**state, "mqtt_sent": True}

        except Exception as error:
            print("Falha ao publicar no MQTT:", error)
            return {**state, "mqtt_sent": False}

    return {**state, "mqtt_sent": False}



# BOTAO FISICO SOLICITA ENCERRAMENTO
@app.post("/api/hardware/{station_id}/stop")
def hardware_stop(station_id: int):
    with hardware_lock:
        state = hardware_states.get(station_id)

        if not state or state["status"] != "charging":
            raise HTTPException(
                status_code=409,
                detail="Nenhum carregamento ativo"
            )

        state["stop_requested"] = True

        return {
            "message": "Encerramento solicitado",
            "stop_requested": True
        }



# ===== CHARGEGRID - BOTAO FISICO ESP32 =====

import os
import ssl
import json
import certifi
import paho.mqtt.client as paho_mqtt

import hashlib
import hmac
import re
import time
from urllib.request import Request as UrlRequest, urlopen
from urllib.error import HTTPError, URLError

from pathlib import Path
from collections import deque
from threading import Lock
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

BUTTON_TOPIC = "chargegrid/prototipo01/button"
RFID_TOPIC = "chargegrid/prototipo01/rfid"
RFID_DEVICE_ID = "chargegrid-esp32-wokwi-01"

rfid_lock = Lock()
rfid_enrollments = {}
RFID_ENROLL_SECONDS = 60
rfid_login_events = deque(maxlen=100)
rfid_login_lock = Lock()
rfid_login_counter = 0
BUTTON_HOST = "f1c11160.ala.us-east-1.emqxsl.com"

button_events = deque(maxlen=100)
button_lock = Lock()
button_counter = 0
last_press_by_device = {}
button_mqtt_client = None


def on_button_connect(
    client, userdata, flags, reason_code, properties
):
    if reason_code == 0:
        client.subscribe([
            (BUTTON_TOPIC, 0),
            (RFID_TOPIC, 0),
        ])
        print("ESP32 BOTAO: conectado ao EMQX!")
    else:
        print("ESP32 BOTAO: erro MQTT:", reason_code)


def on_button_message(client, userdata, message):
    global button_counter

    try:
        data = json.loads(message.payload.decode("utf-8"))
        if message.topic == RFID_TOPIC:
            process_rfid_reading(data)
            return

        if message.topic != BUTTON_TOPIC:
            return

        if data.get("event") != "button_press":
            return

        device_id = data.get("device_id")
        press_id = data.get("press_id")

        if not isinstance(device_id, str):
            return

        if type(press_id) is not int:
            return

        with button_lock:
            # Ignora repeticao da ultima mensagem do dispositivo
            if last_press_by_device.get(device_id) == press_id:
                return

            last_press_by_device[device_id] = press_id
            button_counter += 1

            button_events.append({
                "id": button_counter,
                "device_id": device_id,
                "press_id": press_id,
            })

        print(f"BOTAO FISICO: clique {press_id}")

    except Exception as error:
        print("Erro ao receber botao:", error)


@app.on_event("startup")
def iniciar_mqtt_botao():
    global button_mqtt_client

    usuario = os.getenv("CHARGEGRID_MQTT_USER")
    senha = os.getenv("CHARGEGRID_MQTT_PASSWORD")

    if not usuario or not senha:
        print("MQTT botao: faltam credenciais no .env")
        return

    client = paho_mqtt.Client(
        paho_mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"chargegrid-api-buttons-{os.getpid()}"
    )

    client.username_pw_set(usuario, senha)

    client.tls_set(
        ca_certs=certifi.where(),
        tls_version=ssl.PROTOCOL_TLS_CLIENT
    )

    client.on_connect = on_button_connect
    client.on_message = on_button_message

    client.reconnect_delay_set(
        min_delay=1,
        max_delay=30
    )

    button_mqtt_client = client

    client.connect_async(BUTTON_HOST, 8883, 60)
    client.loop_start()


@app.on_event("shutdown")
def parar_mqtt_botao():
    if button_mqtt_client is not None:
        button_mqtt_client.disconnect()
        button_mqtt_client.loop_stop()


@app.get("/api/hardware/1/button-events")
def consultar_cliques(after: int = 0):
    with button_lock:
        return {
            "events": [
                event
                for event in button_events
                if event["id"] > after
            ],
            "latest_id": button_counter,
        }


def rfid_hash(uid: str) -> str:
    secret = os.getenv("RFID_UID_SECRET")

    if not secret:
        raise RuntimeError("RFID_UID_SECRET não configurado")

    return hmac.new(
        secret.encode("utf-8"),
        uid.encode("ascii"),
        hashlib.sha256
    ).hexdigest()


def rfid_customer_from_auth(authorization: str | None) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Faça login no aplicativo"
        )

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")

    if not supabase_url or not anon_key:
        raise HTTPException(
            status_code=500,
            detail="Autenticação Supabase não configurada"
        )

    request = UrlRequest(
        f"{supabase_url}/auth/v1/user",
        headers={
            "apikey": anon_key,
            "Authorization": authorization,
            "Accept": "application/json",
        }
    )

    try:
        with urlopen(request, timeout=8) as response:
            authenticated_user = json.load(response)
    except HTTPError:
        raise HTTPException(
            status_code=401,
            detail="Sessão inválida ou expirada"
        )
    except (URLError, TimeoutError):
        raise HTTPException(
            status_code=503,
            detail="Não foi possível verificar a autenticação"
        )

    auth_user_id = authenticated_user.get("id")

    if not auth_user_id:
        raise HTTPException(
            status_code=401,
            detail="Usuário não autenticado"
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM public.customers
            WHERE auth_user_id = %s
            """,
            (auth_user_id,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado"
            )

        return int(customer["id"])

    finally:
        cursor.close()
        conn.close()


def process_rfid_reading(data: dict):
    if data.get("event") != "rfid_detected":
        return

    device_id = data.get("device_id")
    raw_uid = data.get("uid")

    if device_id != RFID_DEVICE_ID or not isinstance(raw_uid, str):
        return

    uid = raw_uid.replace(":", "").strip().upper()

    # Cartões ISO14443A normalmente têm UID de 4, 7 ou 10 bytes.
    if not re.fullmatch(r"(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})", uid):
        return

    now = time.monotonic()


    with rfid_lock:
        enrollment = rfid_enrollments.get(device_id)

        cadastro_ativo = (
            enrollment is not None
            and enrollment["status"] == "waiting"
            and enrollment["expires_at"] > now
        )

        if cadastro_ativo:
            enrollment["status"] = "processing"
            customer_id = enrollment["customer_id"]

    # Se ninguém estiver cadastrando, trata como
    # identificação de um cartão já vinculado.
    if not cadastro_ativo:
        process_rfid_login(uid, device_id)
        return


    conn = None
    cursor = None

    try:
        uid_hash = rfid_hash(uid)

        conn = get_connection()
        cursor = conn.cursor()

        # Não permite que um cartão de outro usuário seja tomado.
        cursor.execute(
            """
            SELECT customer_id
            FROM public.rfid_cards
            WHERE uid_hash = %s
            """,
            (uid_hash,)
        )

        existing = cursor.fetchone()

        if existing and int(existing["customer_id"]) != customer_id:
            raise ValueError(
                "Este cartão já está vinculado a outra conta"
            )

        cursor.execute(
            """
            INSERT INTO public.rfid_cards (
                customer_id,
                uid_hash,
                status
            )
            VALUES (%s, %s, 'active')

            ON CONFLICT (customer_id)
            DO UPDATE SET
                uid_hash = EXCLUDED.uid_hash,
                status = 'active'
            """,
            (customer_id, uid_hash)
        )

        conn.commit()

        with rfid_lock:
            enrollment["status"] = "linked"
            enrollment["message"] = "Cartão vinculado com sucesso"

        print("CARTAO GRID: vínculo realizado")

    except Exception as error:
        if conn:
            conn.rollback()

        with rfid_lock:
            enrollment["status"] = "error"
            enrollment["message"] = str(error)

        print("Erro ao vincular cartão RFID:", error)

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.post("/api/rfid/enroll/start")
def start_rfid_enrollment(
    authorization: str | None = Header(default=None)
):
    customer_id = rfid_customer_from_auth(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM public.rfid_cards
            WHERE customer_id = %s
              AND status = 'active'
            """,
            (customer_id,)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="Você já possui um cartão vinculado"
            )

    finally:
        cursor.close()
        conn.close()

    now = time.monotonic()

    with rfid_lock:
        current = rfid_enrollments.get(RFID_DEVICE_ID)

        if (
            current
            and current["status"] in ("waiting", "processing")
            and current["expires_at"] > now
            and current["customer_id"] != customer_id
        ):
            raise HTTPException(
                status_code=409,
                detail="O leitor está sendo utilizado por outro motorista"
            )

        rfid_enrollments[RFID_DEVICE_ID] = {
            "customer_id": customer_id,
            "status": "waiting",
            "expires_at": now + RFID_ENROLL_SECONDS,
            "message": "Aproxime seu cartão no leitor"
        }

    return {
        "status": "waiting",
        "message": "Aproxime seu cartão no leitor em até 60 segundos"
    }


@app.get("/api/rfid/card")
def get_rfid_card(
    authorization: str | None = Header(default=None)
):
    customer_id = rfid_customer_from_auth(authorization)

    with rfid_lock:
        enrollment = rfid_enrollments.get(RFID_DEVICE_ID)

        if enrollment and enrollment["customer_id"] == customer_id:
            status = enrollment["status"]

            if status in ("waiting", "processing"):
                if time.monotonic() >= enrollment["expires_at"]:
                    return {
                        "status": "expired",
                        "message": "Tempo para vincular expirou"
                    }

                return {
                    "status": "waiting",
                    "message": "Aguardando aproximação do cartão"
                }

            if status == "error":
                return {
                    "status": "error",
                    "message": enrollment["message"]
                }

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM public.rfid_cards
            WHERE customer_id = %s
              AND status = 'active'
            """,
            (customer_id,)
        )

        card = cursor.fetchone()

        return {
            "status": "linked" if card else "unlinked"
        }

    finally:
        cursor.close()
        conn.close()


@app.delete("/api/rfid/card")
def unlink_rfid_card(
    authorization: str | None = Header(default=None)
):
    customer_id = rfid_customer_from_auth(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            DELETE FROM public.rfid_cards
            WHERE customer_id = %s
            """,
            (customer_id,)
        )

        conn.commit()

        with rfid_lock:
            current = rfid_enrollments.get(RFID_DEVICE_ID)

            if current and current["customer_id"] == customer_id:
                del rfid_enrollments[RFID_DEVICE_ID]

        return {"status": "unlinked"}

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


def process_rfid_login(uid: str, device_id: str):
    global rfid_login_counter

    conn = get_connection()
    cursor = conn.cursor()

    try:
        uid_hash = rfid_hash(uid)

        cursor.execute(
            """
            SELECT customer_id
            FROM public.rfid_cards
            WHERE uid_hash = %s
              AND status = 'active'
            LIMIT 1
            """,
            (uid_hash,)
        )

        card = cursor.fetchone()

        if not card:
            print("RFID: cartão não vinculado")
            return

        customer_id = int(card["customer_id"])

        # Registra a identificação para o painel
        # sem enviar dados pessoais pelo MQTT.
        with rfid_login_lock:
            rfid_login_counter += 1

            rfid_login_events.append({
                "id": rfid_login_counter,
                "device_id": device_id,
                "customer_id": customer_id,
                "created_at": time.monotonic(),
                "used": False,
            })

        cursor.execute(
            """
            UPDATE public.rfid_cards
            SET last_used_at = NOW()
            WHERE uid_hash = %s
            """,
            (uid_hash,)
        )

        conn.commit()

        print("RFID: cartão reconhecido pelo ChargeGrid")

    except Exception as error:
        conn.rollback()
        print("Erro na identificação RFID:", error)

    finally:
        cursor.close()
        conn.close()

@app.get("/api/hardware/1/rfid-events")
def consultar_rfid_events(after: int = 0):
    now = time.monotonic()

    with rfid_login_lock:
        return {
            "events": [
                {
                    "id": event["id"],
                    "device_id": event["device_id"],
                }
                for event in rfid_login_events
                if (
                    event["id"] > after
                    and not event["used"]
                    and now - event["created_at"] <= 30
                )
            ],
            "latest_id": rfid_login_counter,
        }


from pydantic import BaseModel

class RFIDLoginRequest(BaseModel):
    event_id: int


@app.post("/api/hardware/1/rfid-login")
def consumir_login_rfid(data: RFIDLoginRequest):
    now = time.monotonic()

    with rfid_login_lock:
        event = next(
            (
                e for e in rfid_login_events
                if e["id"] == data.event_id
            ),
            None
        )

        if (
            event is None
            or event["used"]
            or now - event["created_at"] > 30
            or event["device_id"] != RFID_DEVICE_ID
        ):
            raise HTTPException(
                status_code=404,
                detail="Leitura RFID expirada ou já utilizada"
            )

        event["used"] = True
        customer_id = event["customer_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT id, first_name, last_name
            FROM public.customers
            WHERE id = %s
            """,
            (customer_id,)
        )

        customer = cursor.fetchone()

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado"
            )

        cursor.execute(
            """
            SELECT
                id,
                customer_id,
                model,
                battery_capacity_kwh,
                current_battery_pct,
                max_charge_power_kw
            FROM public.vehicles
            WHERE customer_id = %s
              AND is_active = true
            LIMIT 1
            """,
            (customer_id,)
        )

        vehicle = cursor.fetchone()

        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail="Nenhum veículo ativo encontrado"
            )

        return {
            "customer_id": customer["id"],
            "first_name": customer["first_name"],
            "last_name": customer["last_name"],
            "vehicle": dict(vehicle),
        }

    finally:
        cursor.close()
        conn.close()
