# ⚡ ChargeGrid

Plataforma inteligente para gerenciamento e simulação de recargas de veículos elétricos, desenvolvida para o **GoodWe EV Challenge**.

O ChargeGrid integra uma aplicação para o usuário, um painel de carregamento e uma API conectada ao banco de dados, permitindo gerenciar veículos, realizar simulações de recarga, acompanhar custos e conectar o usuário ao painel por meio de um código de conexão.

---

## 🚗 Sobre o projeto

O ChargeGrid foi desenvolvido com o objetivo de tornar o processo de carregamento de veículos elétricos mais simples e integrado.

A solução é dividida em três principais módulos:

### 📱 ChargeGrid App

Aplicação utilizada pelo proprietário do veículo.

Permite:

- Criar conta e realizar autenticação
- Cadastrar múltiplos veículos elétricos
- Definir qual veículo está ativo
- Visualizar capacidade da bateria
- Visualizar potência máxima de carregamento
- Informar o nível atual da bateria
- Calcular energia necessária para uma recarga
- Estimar o custo da recarga
- Estimar o tempo de carregamento
- Consultar histórico de recargas
- Localizar eletropostos
- Gerar e visualizar um código de conexão com o painel

---

### ⚡ Painel de Carregamento

Interface utilizada na estação de carregamento.

O usuário pode utilizar o painel de duas formas:

**Conectar com o App**

O usuário informa o código de conexão disponibilizado no ChargeGrid App.

O sistema identifica automaticamente:

- Cliente
- Veículo ativo
- Capacidade da bateria
- Nível atual da bateria
- Potência máxima suportada pelo veículo

Isso permite iniciar o carregamento utilizando os dados previamente cadastrados no aplicativo.

**Modo visitante**

Também é possível utilizar o carregador sem possuir uma conta no ChargeGrid.

O painel permite iniciar uma sessão independente para utilização da estação.

---

### 🔌 API

O backend foi desenvolvido utilizando **FastAPI** e funciona como camada de comunicação entre o painel e o banco de dados.

Entre suas responsabilidades estão:

- Gerenciamento de clientes
- Gerenciamento de veículos
- Consulta de estações
- Registro de sessões de carregamento
- Consulta da tarifa atual
- Cálculos relacionados ao carregamento
- Conexão do painel através do código do aplicativo
- Disponibilização de informações administrativas

---

## 🔗 Conexão App ↔ Painel

Uma das principais funcionalidades do ChargeGrid é a integração entre o aplicativo e o painel de carregamento.

O fluxo funciona da seguinte forma:

```text
Usuário
   │
   ▼
ChargeGrid App
   │
   │ Código de conexão
   ▼
Painel de Carregamento
   │
   ▼
FastAPI
   │
   ▼
Supabase
   │
   ▼
Cliente + Veículo Ativo
```

O usuário acessa seu código pelo aplicativo e informa esse código no painel.

A API consulta o banco de dados e retorna as informações relacionadas à conta e ao veículo ativo.

---

## 🏗️ Arquitetura

```text
ChargeGrid
│
├── app_chargergrid/
│   └── Aplicação do usuário
│
├── painel-carregamento/
│   └── Interface da estação de carregamento
│
├── backend_python/
│   └── API FastAPI
│
└── README.md
```

Arquitetura simplificada:

```text
┌─────────────────────┐
│   ChargeGrid App    │
│ React + TypeScript  │
└──────────┬──────────┘
           │
           │
           ▼
┌─────────────────────┐
│      Supabase       │
│ Auth + PostgreSQL   │
└──────────▲──────────┘
           │
           │
┌──────────┴──────────┐
│    FastAPI API      │
│       Python        │
└──────────▲──────────┘
           │
           │
┌──────────┴──────────┐
│ Painel Carregamento │
│ React + TypeScript  │
└─────────────────────┘
```

---

## 🛠️ Tecnologias utilizadas

### Front-end

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Router
- TanStack Query
- Lucide React

### Back-end

- Python
- FastAPI
- Pydantic
- CORS Middleware

### Banco de dados e autenticação

- Supabase
- PostgreSQL
- Supabase Auth

### Desenvolvimento

- Git
- GitHub
- VS Code
- npm
- Python Virtual Environment

---

## 🗄️ Banco de dados

O sistema utiliza um banco PostgreSQL integrado ao Supabase.

Entre as principais entidades utilizadas estão:

```text
customers
vehicles
charge_sessions
stations
tariff_periods
```

### Vehicles

Os veículos armazenam informações como:

```text
id
customer_id
model
battery_capacity_kwh
current_battery_pct
max_charge_power_kw
is_active
```

O campo `is_active` permite que um usuário possua vários veículos cadastrados, mas escolha qual deles será utilizado pelo sistema e enviado ao painel através da conexão.

---

## 🔋 Cálculo de carregamento

O sistema utiliza informações como:

- Capacidade da bateria
- Bateria atual
- Bateria desejada
- Potência máxima do veículo
- Tarifa por kWh

A energia necessária pode ser estimada por:

```text
Energia necessária =
Capacidade da bateria × (Bateria desejada - Bateria atual) / 100
```

O custo estimado é calculado por:

```text
Custo = Energia necessária × Tarifa por kWh
```

E o tempo teórico de carregamento:

```text
Tempo = Energia necessária / Potência de carregamento
```

---

## 💰 Tarifas

O ChargeGrid possui suporte a tarifas de energia por período.

O sistema consulta a tarifa vigente e utiliza o valor por kWh para calcular o custo estimado da recarga.

Dessa forma, o usuário consegue visualizar previamente quanto poderá gastar para carregar o veículo.

---

## 📊 Histórico de carregamento

As sessões concluídas podem ser armazenadas no banco de dados contendo informações como:

- Cliente
- Veículo
- Estação
- Bateria inicial
- Bateria final
- Energia utilizada
- Preço por kWh
- Custo total
- Horário de início
- Horário de término
- Duração
- Status

Esses dados permitem acompanhar o consumo e os gastos relacionados às recargas.

---

## 🛡️ Painel administrativo

O projeto também possui recursos administrativos para consulta dos dados registrados pelo sistema.

A API disponibiliza informações relacionadas a:

- Clientes
- Veículos
- Sessões de carregamento

Isso permite acompanhar as operações realizadas através da plataforma.

---

## ▶️ Executando o projeto

Clone o repositório:

```bash
git clone https://github.com/Camper-Lingo/ChargeGrid.git
cd ChargeGrid
```

### ChargeGrid App

```bash
cd app_chargergrid
npm install
npm run dev
```

### Painel

Em outro terminal:

```bash
cd painel-carregamento
npm install
npm run dev
```

### API

Em outro terminal:

```bash
cd backend_python
```

Crie o ambiente virtual:

```bash
python -m venv venv
```

No Windows:

```bash
venv\Scripts\activate
```

Instale as dependências do backend conforme a configuração do projeto e execute a API, por exemplo:

```bash
uvicorn main:app --reload
```

A API ficará disponível localmente, por padrão, em:

```text
http://localhost:8000
```

---

## 🔐 Variáveis de ambiente

Dados sensíveis e configurações locais devem ser armazenados em arquivos `.env`.

O `.env` não deve ser enviado para o GitHub.

Exemplo:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
DATABASE_URL=...
```

Cada desenvolvedor deve configurar suas próprias variáveis de ambiente antes de executar o projeto.

---

## 👥 Integrantes

| Nome | RM |
|---|---|
| João Pedro Camperlingo | RM 568957 |
| Lucas Silva | RM 572321 |
| Nicolas Nishi | RM 572242 |
| Enzo Guislandi | RM 569885 |
| Guilherme Reiche | RM 569918 |

---

## 🎓 Projeto acadêmico

**FIAP — Ciência da Computação**

Projeto desenvolvido no contexto do **GoodWe EV Challenge**, aplicando conceitos de desenvolvimento web, APIs, banco de dados, integração de sistemas e experiência do usuário.

---

## ⚡ ChargeGrid

**Recarga inteligente, conectada e simplificada.**
