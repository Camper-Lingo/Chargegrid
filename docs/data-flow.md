# ChargeGrid — Data Flow

## Fluxo Principal

O fluxo principal do ChargeGrid representa toda a jornada de uma recarga:

Cadastro
↓
Código de conexão
↓
Reserva da estação
↓
Configuração da recarga
↓
Gestão de demanda
↓
Cálculo da tarifa
↓
Recarga
↓
Sessão
↓
Pagamento
↓
Histórico
↓
Relatórios
↓
Inteligência operacional

## Cadastro e Veículo

O usuário realiza seu cadastro pelo AppGrid e cadastra seu veículo.

Os dados são enviados ao backend FastAPI e armazenados no Supabase/PostgreSQL.

## Código de Conexão

O usuário recebe um código de conexão.

Esse código pode ser utilizado no painel de carregamento para identificar o cliente e seu veículo.

Fluxo:

AppGrid
→ Código de conexão
→ Painel de Carregamento
→ Backend
→ Cliente e veículo

## Reserva da Estação

Quando uma recarga é iniciada, o sistema procura uma estação disponível.

available → occupied

Ao finalizar a utilização:

occupied → available

## Gestão de Demanda

Durante a operação, o ChargeGrid verifica:

- Limite da instalação
- Consumo do estabelecimento
- Potência solicitada pelos veículos

Caso a demanda ultrapasse o limite disponível, o sistema reduz temporariamente a potência destinada aos carregadores.

## Cálculo Tarifário

O backend calcula o custo da recarga considerando a energia necessária, potência e horário da sessão.

## Recarga

Durante a recarga, o painel apresenta informações como:

- Bateria
- Potência
- Energia
- Tempo
- Temperatura
- Custo
- Estado da gestão de demanda

## Sessão

Quando a recarga termina ou é cancelada, os dados da sessão são enviados ao backend e armazenados no banco.

## Histórico e Operação

As sessões armazenadas alimentam:

- Histórico do motorista
- Dashboard do operador
- Relatórios
- Financeiro
- Inteligência operacional