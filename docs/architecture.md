# Arquitetura do ChargeGrid

## Visão Geral

O ChargeGrid é uma plataforma para gerenciamento de recarga de veículos elétricos.

A solução foi dividida em aplicações independentes para separar as responsabilidades do motorista, terminal de carregamento, operador e backend.

## Componentes

### AppGrid — Aplicação do Motorista

Responsável pela experiência do usuário.

Principais funções:

- Cadastro do usuário
- Cadastro do veículo
- Geração de código de conexão
- Consulta de eletropostos
- Histórico de recargas
- Acompanhamento das informações do usuário

---

### Painel de Carregamento

Representa a interface disponível no terminal de carregamento.

Principais funções:

- Conexão através do código do usuário
- Modo visitante
- Seleção/reserva de estação
- Identificação do veículo
- Definição da recarga
- Exibição da potência
- Acompanhamento da bateria
- Exibição do custo
- Pausa e encerramento da recarga
- Recebimento das decisões da gestão de demanda

Quando necessário, o ChargeGrid pode reduzir temporariamente a potência de carregamento para respeitar o limite energético da instalação.

---

### Painel do Operador

Interface administrativa e operacional da plataforma.

Principais áreas:

- Dashboard
- Estações
- Sessões
- Clientes
- Gestão de demanda
- Financeiro
- Inteligência operacional

O painel permite acompanhar o funcionamento da rede e visualizar indicadores operacionais.

---

### Backend — FastAPI

O backend funciona como o núcleo da plataforma.

Responsabilidades:

- Gerenciamento de clientes
- Gerenciamento de veículos
- Gerenciamento de estações
- Reserva e liberação de estações
- Sessões de carregamento
- Cálculo tarifário
- Gestão dinâmica de demanda
- APIs utilizadas pelos diferentes frontends

Todos os módulos utilizam o mesmo backend como fonte central das regras de negócio.

---

### Banco de Dados — Supabase / PostgreSQL

Responsável pela persistência dos dados da plataforma.

Armazena informações relacionadas a:

- Clientes
- Veículos
- Estações
- Sessões de carregamento

---

## Arquitetura Simplificada

```text
                    ┌──────────────────────┐
                    │      ChargeGrid      │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌──────────────┐  ┌──────────────┐
       │  AppGrid   │   │   Painel de  │  │   Painel do  │
       │ Motorista  │   │ Carregamento │  │   Operador   │
       └─────┬──────┘   └──────┬───────┘  └──────┬───────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                      ┌─────────────────┐
                      │ FastAPI Backend │
                      └────────┬────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Supabase/PostgreSQL │
                    └─────────────────────┘