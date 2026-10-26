# ⚡ ChargeGrid
### Intelligent EV Charging Ecosystem

**Connecting electric mobility, artificial intelligence, energy management, and IoT in one integrated platform.**

![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Type%20Safety-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-IoT-E7352C)
![MQTT](https://img.shields.io/badge/MQTT-Communication-660066)

---

## Overview

**ChargeGrid** is an integrated electric vehicle charging management platform designed to connect drivers, charging infrastructure, and station operators through a unified digital ecosystem.

Developed as an academic engineering project in the context of the **FIAP × GoodWe Challenge**, ChargeGrid explores how software engineering, AI-assisted mobility, real-time communication, and IoT can make EV charging more accessible, efficient, and intelligent.

Instead of treating charging stations as isolated devices, ChargeGrid brings together the entire charging experience: from trip planning and driver authentication to session monitoring, energy analysis, and operational management.

### The Problem

The adoption of electric vehicles introduces challenges that go beyond installing charging stations:

- **Range anxiety:** drivers need to understand whether their remaining battery is sufficient to complete a trip.
- **Fragmented infrastructure:** charging locations, vehicle information, and charging sessions are often managed independently.
- **Energy demand:** multiple charging sessions can create operational challenges for charging infrastructure.
- **Limited visibility:** station operators need actionable information about sessions, consumption, customers, and revenue.
- **User experience:** physical charging hardware and digital applications must communicate reliably.

**ChargeGrid addresses these challenges through a modular, connected system.**

---

## Platform Components

ChargeGrid is composed of four complementary systems.

| Component | Purpose | Technologies |
|---|---|---|
| **Driver Application** | Vehicle management, charging information, digital wallet, charging history, and AI-assisted trip planning | React, TypeScript, TanStack Start |
| **Charging Kiosk** | Interactive charging experience, station connection, charging session flow, and payment interface | React, TypeScript, Vite |
| **Operator Dashboard** | Station monitoring, session management, customer information, financial insights, and energy demand analysis | React, TypeScript, Vite |
| **Backend & IoT Integration** | Business logic, charging operations, authentication integration, and device communication | Python, FastAPI, PostgreSQL, MQTT, ESP32 |

These components are designed to work together while maintaining clear responsibilities and modular boundaries.

---

## Key Features

### 1. AI-Assisted Trip Planning

ChargeGrid includes a trip-planning module designed to support more informed electric vehicle journeys.

The system considers information such as:

- Trip origin and destination
- Selected electric vehicle
- Battery capacity and initial charge level
- Estimated driving range and energy consumption
- Charging stops along the journey

The planning workflow combines route calculations and vehicle data with an AI-assisted interface to make travel recommendations easier to understand.

The project also explores public charging infrastructure discovery through **Open Charge Map**.

**Engineering principle:** critical energy and range estimates should be calculated using explicit rules and vehicle parameters rather than trusting unrestricted AI-generated numbers.

> Range predictions are estimates, not guarantees. Driving conditions, temperature, terrain, battery health, and vehicle efficiency can affect real-world results. Public charger data does not guarantee live availability.

### 2. EV Charging Experience

The charging kiosk provides an interactive interface covering the main steps of a charging session.

Its architecture includes:

- Driver identification and station connection
- Vehicle and charging information
- Charging preferences
- Charging progress visualization
- Charging history and session information
- Payment-related interface flows

The objective is to make the interaction with charging infrastructure intuitive while connecting the physical charging experience to the broader platform.

### 3. IoT and RFID Integration

ChargeGrid explores hardware-to-software integration through an **ESP32-based prototype**.

The hardware architecture incorporates:

- ESP32 microcontroller
- MFRC522 RFID reader
- LCD display
- Buzzer feedback
- Wi-Fi connectivity
- MQTT messaging

RFID events can be transmitted from the ESP32 to the backend, connecting physical card interactions with the application's charging and identification workflows.

This demonstrates how embedded systems, asynchronous communication, backend services, and user interfaces can operate together.

**Security consideration:** RFID card identifiers are not sufficient as a standalone high-assurance authentication mechanism. Additional verification is required for security-sensitive operations.

### 4. Energy Demand Management

ChargeGrid also approaches EV charging from the operator's perspective.

The demand management module is designed to provide visibility into energy-related operational data, including charging power, session activity, and consumption.

This information can support:

- Monitoring charging infrastructure utilization
- Understanding energy demand
- Reviewing charging session performance
- Supporting infrastructure planning
- Identifying opportunities for improved energy efficiency

The project also includes an analytics-oriented foundation for exploring AI-assisted operational insights.

### 5. Operator Dashboard

The operator interface centralizes information that would otherwise be distributed across multiple systems.

Its modules include:

| Module | Responsibility |
|---|---|
| Dashboard | Operational overview and key indicators |
| Stations | Charging station information and management |
| Sessions | Charging activity and session records |
| Customers | Customer information |
| Finance | Financial and charging-related insights |
| Demand | Energy demand analysis |
| Intelligence | Analytical and AI-oriented capabilities |

### 6. Digital Wallet and Charging History

The driver-facing platform includes functionality for managing a digital wallet and reviewing charging activity.

These features connect the charging experience to transaction records and provide a foundation for tracking usage and costs.

Payment-related workflows are part of the prototype. Production financial processing requires a properly integrated payment provider, authorization controls, and additional security validation.

---

## System Architecture

ChargeGrid follows a modular architecture that separates user interfaces, business logic, data persistence, and physical device communication.

```mermaid
flowchart TB
    subgraph Frontend["Application Layer"]
        A["Driver Application"]
        B["Charging Kiosk"]
        C["Operator Dashboard"]
    end

    subgraph Services["Service Layer"]
        D["FastAPI Backend"]
        E["Trip Planning & AI Services"]
        F["MQTT Messaging"]
    end

    subgraph Data["Data Layer"]
        G[("Supabase / PostgreSQL")]
        H
