from fastapi import FastAPI, HTTPException
from database import get_connection
from schemas import ChargeSessionCreate, CustomerCreate, VehicleCreate,ChargingCalculationRequest
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from tariff import (
    obter_info_tarifa,
    calcular_carga_por_energia
)


app = FastAPI(title="GoodWe Charging API")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
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
        cursor.execute(
            "INSERT INTO customers (first_name, last_name) VALUES (%s, %s) RETURNING id",
            (customer.first_name, customer.last_name)
        )
        novo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"customer_id": novo_id}

    except Exception as erro:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {erro}")

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
        cursor.execute("SELECT id, code, max_power_kw, status FROM stations WHERE status = 'active'")
        resultados = cursor.fetchall()
        return resultados

    finally:
        cursor.close()
        conn.close()

@app.post("/api/charging/calculate")
def calculate_charging(data: ChargingCalculationRequest):

    resultado = calcular_carga_por_energia(
        data.energy_needed_kwh,
        data.power_kw,
        data.start_time
    )

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