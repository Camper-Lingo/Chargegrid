
import os
import json
import certifi
import paho.mqtt.publish as mqtt_publish

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

MQTT_HOST = "f1c11160.ala.us-east-1.emqxsl.com"
MQTT_PORT = 8883
MQTT_TOPIC = "chargegrid/prototipo01/state"


def publish_hardware_state(state: dict):
    username = os.getenv("CHARGEGRID_MQTT_USER")
    password = os.getenv("CHARGEGRID_MQTT_PASSWORD")

    if not username or not password:
        raise RuntimeError("Credenciais MQTT nao configuradas")

    mqtt_publish.single(
        topic=MQTT_TOPIC,
        payload=json.dumps(state, ensure_ascii=False),
        hostname=MQTT_HOST,
        port=MQTT_PORT,
        auth={
            "username": username,
            "password": password,
        },
        tls={
            "ca_certs": certifi.where(),
        },
        qos=1,
        retain=False,
    )
