// src/App.tsx

import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Layout/Header';
import { DashboardScreen } from './components/Screens/DashboardScreen';
import { SelectChargeScreen } from './components/Screens/SelectChargeScreen';
import { ConfirmScreen } from './components/Screens/ConfirmScreen';
import { ConnectionScreen } from './components/Screens/ConnectionScreen';
import { ChargingScreen } from './components/Screens/ChargingScreen';
import { HistoryScreen } from './components/Screens/HistoryScreen';
import { SplashScreen } from './components/Screens/SplashScreen';
import { PaymentScreen } from './components/Screens/PaymentScreen';
import ChargeGridChat from "./components/ChargeGridChat";
import { WelcomeScreen } from './components/Screens/WelcomeScreen';
import { ToastContainer } from './components/Common/Toast';
import { useStorage } from './hooks/useStorage';
import {
  createCustomer,
  createVehicle,
  getStations,
  saveChargeSession,
  connectByCode,
  occupyRandomStation,
  type ApiStation,
} from './services/apiClient';
import type { Screen, ChargeCalculation, ChargeSession, Tariff, ToastData, Car } from './types';

function generateRandomPlate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const randomLetters = Array.from(
    { length: 3 },
    () => letters[Math.floor(Math.random() * letters.length)]
  ).join('');

  const randomNumbers = Math.floor(1000 + Math.random() * 9000);

  return `${randomLetters}-${randomNumbers}`;
}

// Agora retorna os dados "crus" do carro sorteado, sem o id (o id vem do backend)
function pickRandomCarSpecs() {
  const cars = [
    { model: 'Tesla Model 3', batteryCapacity: 60, maxPower: 100 },
    { model: 'BYD Dolphin', batteryCapacity: 44.9, maxPower: 60 },
    { model: 'GWM Ora 03', batteryCapacity: 48, maxPower: 67 },
    { model: 'Volvo EX30', batteryCapacity: 69, maxPower: 153 },
  ];

  const selectedCar = cars[Math.floor(Math.random() * cars.length)];
  const currentCharge = Math.floor(Math.random() * 81) + 10;

  return {
    model: selectedCar.model,
    licensePlate: generateRandomPlate(),
    batteryCapacity: selectedCar.batteryCapacity,
    currentCharge,
    maxPower: selectedCar.maxPower,
    temperature: Math.floor(Math.random() * 11) + 23,
  };
}

function App() {
  const [tariff, setTariff] = useState<Tariff>({
  currentRate: 0,
  peakHours: [],
  offPeakRate: 0,
  peakRate: 0,
  lastUpdated: '',
});

useEffect(() => {
  const fetchTariff = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/tariff');

      if (!response.ok) {
        throw new Error('Erro ao buscar tarifa');
      }

      const data = await response.json();

      setTariff({
        currentRate: data.rate,
        peakHours: [],
        offPeakRate: 0,
        peakRate: data.rate,
        lastUpdated: data.current_time,
      });

    } catch (error) {
      console.error('Erro ao carregar tarifa:', error);
    }
  };

  fetchTariff();
}, []);


function generateId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
const [dbCustomerId, setDbCustomerId] = useState<number | null>(null);

const [dashboardWallet, setDashboardWallet] = useState<{
  total: number;
  tierName: string;
} | null>(null);

const [dashboardWalletLoading, setDashboardWalletLoading] =
  useState(false);

  const {
    car,
    user,
    history,
    currentSession,
    saveCar,
    saveUser,
    updateCarCharge,
    startSession,
    endSession,
    clearAllHistory,
  } = useStorage(dbCustomerId);

  // 'splash' | 'welcome' são fases de onboarding; depois disso usa `screen`
  type AppPhase = 'splash' | 'connection' | 'welcome' | 'app';

  const [appPhase, setAppPhase] = useState<AppPhase>(() => {
    const returnToLogin = sessionStorage.getItem(
      "chargegrid_return_to_login"
    );

    if (returnToLogin === "1") {
      sessionStorage.removeItem(
        "chargegrid_return_to_login"
      );

      return "connection";
    }

    return "splash";
  });

  const [screen, setScreen] = useState<Screen>('dashboard');
  const [chargeTarget, setChargeTarget] = useState(80);
  const [chargeCalc, setChargeCalc] = useState<ChargeCalculation | null>(null);
  const [paymentData, setPaymentData] = useState<{
  sessionId: number;
  customerId: number;
  totalCost: number;
  energyUsed: number;
  duration: number;
} | null>(null);
  const [activeSession, setActiveSession] = useState<ChargeSession | null>(currentSession);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // ── IDs do banco de dados (não existiam antes — o front só tinha ids locais) ──
  const [dbVehicleId, setDbVehicleId] = useState<number | null>(null);
  const [, setApiStations] = useState<ApiStation[]>([]);
  const [station, setStation] = useState<ApiStation | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);

  const exitingRef = useRef(false);

  const connectionInProgressRef = useRef(false);

  type ConnectedCustomer = Awaited<
    ReturnType<typeof connectByCode>
  >;

  const connectWithCodeRef = useRef<
    ((
      code: string,
      rfidResult?: ConnectedCustomer
    ) => Promise<void>) | null
  >(null);


  const paymentLcdTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);


  useEffect(() => {
    if (
      appPhase !== "app" ||
      !station?.id ||
      !station.reservation_token
    ) {
      return;
    }

    const stationId = station.id;
    const token = station.reservation_token;

    let stopped = false;

    async function renewReservation() {
      if (stopped) return;

      try {
        const response = await fetch(
          `http://localhost:8000/api/stations/${stationId}/heartbeat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reservation_token: token,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            "Falha ao renovar reserva:",
            response.status
          );
        }
      } catch (error) {
        console.error(
          "Erro de conexão ao renovar reserva:",
          error
        );
      }
    }

    // Renova imediatamente ao entrar.
    void renewReservation();

    // Depois, renova a cada 30 segundos.
    const interval = window.setInterval(() => {
      void renewReservation();
    }, 30000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [
    appPhase,
    station?.id,
    station?.reservation_token,
  ]);



  useEffect(() => {
  console.log("DEBUG RESERVA:", {
    appPhase,
    stationId: station?.id,
    token: station?.reservation_token,
    screen,
    activeSession: Boolean(activeSession),
  });

    if (
      appPhase !== "app" ||
      !station?.id ||
      !station?.reservation_token
    ) {
      return;
    }

    const stationId = station.id;
    const token = station.reservation_token;

    const releaseUrl = `/api/stations/${stationId}/release`;

    const handlePageHide = () => {
      if (exitingRef.current) return;

      if (screen === "payment" && !paymentApproved) {
        return;
      }
      console.log("PAGEHIDE DISPAROU!", {
        screen,
        activeSession: Boolean(activeSession),
        stationId,
        tokenPresente: Boolean(token),
      });
      // Não libera durante um carregamento ativo.
      if (screen === "charging" || activeSession) {
        return;
      }

      const body = JSON.stringify({
        reservation_token: token,
      });

      // Envia a liberação mesmo enquanto a página fecha.
      const blob = new Blob([body], {
        type: "application/json",
      });

      const sent = navigator.sendBeacon(releaseUrl, blob);

      // Tentativa alternativa caso o Beacon não aceite.
      if (!sent) {
        void fetch(releaseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body,
          keepalive: true,
        }).catch((error) => {
          console.error("Erro ao liberar estação:", error);
        });
      }
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [
    appPhase,
    station?.id,
    station?.reservation_token,
    screen,
    activeSession,
    paymentApproved,
  ]);



  useEffect(() => {
    // Mostra a carteira somente para cliente cadastrado.
    if (
      appPhase !== 'app' ||
      screen !== 'dashboard' ||
      !dbCustomerId ||
      !user ||
      user.id.startsWith('guest_')
    ) {
      setDashboardWallet(null);
      return;
    }

    const controller = new AbortController();

    const carregarSaldo = async () => {
      setDashboardWalletLoading(true);
      setDashboardWallet(null);

      try {
        const response = await fetch(
          `http://localhost:8000/api/wallet/${dbCustomerId}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Erro ao consultar saldo");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          if (data.loyalty_member) {
            setDashboardWallet({
              total: Number(data.balance.total),
              tierName: data.tier.name,
            });
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Erro ao consultar Cartao Grid:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDashboardWalletLoading(false);
        }
      }
    };

    void carregarSaldo();

    return () => controller.abort();
  }, [appPhase, screen, dbCustomerId, user?.id]);


  useEffect(() => {
    let ativo = true;
    let ultimoEvento = 0;
    let inicializado = false;
    let consultando = false;

    const verificarBotao = async () => {
      if (!ativo || consultando) return;

      consultando = true;

      try {
        const response = await fetch(
          `http://localhost:8000/api/hardware/1/button-events?after=${ultimoEvento}`
        );

        if (!response.ok) {
          throw new Error('Erro ao consultar botao fisico');
        }

        const data = await response.json();

        if (!ativo) return;

        // Ignora cliques antigos ao abrir o painel
        if (!inicializado) {
          ultimoEvento = data.latest_id;
          inicializado = true;
          console.log('Botao fisico conectado ao painel!');
          return;
        }

        for (const evento of data.events) {
          if (evento.id <= ultimoEvento) continue;

          ultimoEvento = evento.id;

          console.log(
            'CLIQUE FISICO RECEBIDO:',
            evento.press_id
          );

          // PRIMEIRA ETAPA:
          // Dashboard -> Selecao de carregamento


          // PAGAMENTO APROVADO -> VOLTAR AO INICIO
          const botaoVoltarInicio = document.getElementById(
            'finish-payment-btn'
          ) as HTMLButtonElement | null;

          if (botaoVoltarInicio) {
            if (!botaoVoltarInicio.disabled) {
              console.log('ESP32: voltando ao inicio!');
              botaoVoltarInicio.click();
            }

            continue;
          }

          // TELA DE PAGAMENTO -> CONFIRMAR PIX OU CARTAO
          const botaoPagar = document.getElementById(
            'pay-charge-btn'
          ) as HTMLButtonElement | null;

          if (botaoPagar) {
            if (!botaoPagar.disabled) {
              console.log('ESP32: confirmando pagamento!');
              botaoPagar.click();
            } else {
              console.log('ESP32: pagamento em processamento');
            }

            continue;
          }



          const botaoEncerrar = document.getElementById(
            'end-charge-btn'
          ) as HTMLButtonElement | null;

          // CARREGANDO -> ENCERRAR -> PAGAMENTO
          if (botaoEncerrar) {
            if (!botaoEncerrar.disabled) {
              console.log('ESP32: encerrando carregamento!');
              botaoEncerrar.click();
            }

            continue;
          }



          const botaoConfirmar = document.getElementById(
            'confirm-charge-btn'
          ) as HTMLButtonElement | null;

          // TELA DE RESUMO -> INICIAR CARREGAMENTO
          if (botaoConfirmar) {
            if (!botaoConfirmar.disabled) {
              console.log('ESP32: iniciando carregamento!');
              botaoConfirmar.click();
            }

            continue;
          }

          // TELA DE SELECAO -> RESUMO
          const botaoContinuar = document.getElementById(
            'continue-btn'
          ) as HTMLButtonElement | null;

          if (botaoContinuar) {
            if (!botaoContinuar.disabled) {
              console.log('ESP32: confirmando porcentagem escolhida');
              botaoContinuar.click();
            } else {
              console.log('ESP32: selecao invalida');
            }

            continue;
          }

          // DASHBOARD -> SELECAO
          setScreen((telaAtual) => {
            if (telaAtual === 'dashboard') {
              console.log('ESP32: abrindo selecao de bateria');
              return 'select';
            }

            return telaAtual;
          });


        }
      } catch (error) {
        console.error('Erro no botao ESP32:', error);
      } finally {
        consultando = false;
      }
    };

    void verificarBotao();

    const intervalo = window.setInterval(
      verificarBotao,
      600
    );

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);


  // Busca as estações reais do banco assim que o app abre (não depende do cliente)
  useEffect(() => {
    getStations()
      .then((stations) => {
        setApiStations(stations);
      })
      .catch((err) => {
        console.error('Erro ao buscar estações:', err);
        addToast('Não foi possível conectar ao servidor', 'error');
      });
  }, [addToast]);

  // Reset ao abrir o app — sem gerar carro aqui (isso agora acontece
  // só depois que o cliente é criado no backend, dentro de handleNameSubmit)
  useEffect(() => {
    localStorage.removeItem('ev_user');
    localStorage.removeItem('ev_current_session');
    setActiveSession(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Splash complete → ir para Welcome
  const handleSplashComplete = useCallback(() => {
    setAppPhase('connection');
  }, []);

  // Welcome: cria cliente + carro no backend, depois entra no app
  const handleGuestContinue = useCallback(
  async (
    model: string,
    batteryCapacity: number,
    maxPower: number,
    currentBattery: number
  ) => {
    try {
      // 1. Escolhe uma estação REAL disponível
      // e marca como "occupied" no banco
      const selectedStation = await occupyRandomStation();

      if (!selectedStation.reservation_token) {
          throw new Error("A estação foi retornada sem token de reserva.");
      }

      setStation(selectedStation);

      // 2. Cria um customer anônimo no Supabase
      const { customer_id } = await createCustomer(
        'Visitante',
        ''
      );

      setDbCustomerId(customer_id);

      // 3. Cria o veículo escolhido
      const { vehicle_id } = await createVehicle({
        customer_id,
        model,
        battery_capacity_kwh: batteryCapacity,
        current_battery_pct: currentBattery,
        max_charge_power_kw: maxPower,
      });

      setDbVehicleId(vehicle_id);

      // 4. Objeto utilizado pelo painel
      const guestCar: Car = {
        id: `car_${vehicle_id}`,
        model,
        licensePlate: '',
        batteryCapacity,
        currentCharge: currentBattery,
        maxPower,
        temperature: 25,
      };

      saveCar(guestCar);

      // 5. Usuário local
      saveUser({
        id: `guest_${customer_id}`,
        name: 'Visitante',
        surname: '',
        email: '',
        createdAt: new Date().toISOString(),
      });


      // 6. Sincroniza o visitante com o ESP32 fisico
      try {
        const response = await fetch(
          'http://localhost:8000/api/hardware/1/sync',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'connected',
              customer_name: 'Visitante',
              vehicle_model: guestCar.model,
              station_code: selectedStation.code,
              battery_pct: guestCar.currentCharge,
              power_kw: 0,
              energy_kwh: 0,
              cost_brl: 0,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Falha na sincronizacao do LCD');
        }

        const hardware = await response.json();

        if (hardware.mqtt_sent === false) {
          throw new Error('Mensagem nao publicada no MQTT');
        }

        console.log('Visitante enviado ao ESP32!');

      } catch (mqttError) {
        console.error(
          'Erro ao sincronizar visitante com ESP32:',
          mqttError
        );

        addToast(
          'Visitante conectado, mas LCD nao sincronizado.',
          'warning'
        );
      }


      console.log(
        "Visitante conectado à estação:",
        selectedStation.code
      );


      // 7. Entra no painel normalmente
      setAppPhase('app');


      addToast(
        `Modo visitante iniciado • ${selectedStation.name}`,
        'success'
      );
    } catch (err) {
      console.error(
        'Erro ao iniciar modo visitante:',
        err
      );

      addToast(
        'Não foi possível iniciar o modo visitante.',
        'error'
      );

      throw err;
    }
  },
  [
    saveCar,
    saveUser,
    addToast,
    occupyRandomStation,
    setStation,
  ]
);

  // ── Screen handlers ────────────────────────────────────────────────

  const handleConnectCar = useCallback(async () => {
    if (!dbCustomerId) {
      addToast('Cliente não identificado ainda', 'error');
      return;
    }

    try {
  const specs = pickRandomCarSpecs();

  const { vehicle_id } = await createVehicle({
    customer_id: dbCustomerId,
    model: specs.model,
    battery_capacity_kwh: specs.batteryCapacity,
    current_battery_pct: specs.currentCharge,
    max_charge_power_kw: specs.maxPower,
  });

  setDbVehicleId(vehicle_id);

      const newCar: Car = {
        id: `car_${vehicle_id}`,
        model: specs.model,
        licensePlate: specs.licensePlate,
        batteryCapacity: specs.batteryCapacity,
        currentCharge: specs.currentCharge,
        maxPower: specs.maxPower,
        temperature: specs.temperature,
      };

      saveCar(newCar);
      addToast('Veículo conectado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao conectar veículo:', err);
      addToast('Erro ao conectar veículo', 'error');
    }
  }, [dbCustomerId, saveCar, addToast]);

  const handleChargeClick = useCallback(() => {
    setScreen('select');
  }, []);

  const handleSelectContinue = useCallback((target: number, calc: ChargeCalculation) => {
    setChargeTarget(target);
    setChargeCalc(calc);
    setScreen('confirm');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!car || !chargeCalc) return;

    const session: ChargeSession = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      carId: car.id,
      carModel: car.model,
      licensePlate: car.licensePlate,
      startBattery: car.currentCharge,
      endBattery: chargeTarget,
      energyUsed: chargeCalc.energyNeeded,
      costPerKwh: tariff.currentRate,
      totalCost: chargeCalc.totalCostRaw,
      duration: chargeCalc.estimatedTime,
      status: 'charging',
      stationId: station?.code ?? 'SP-001',
    };


    startSession(session);
    setActiveSession(session);
    setScreen('charging');
    addToast('Carregamento iniciado!', 'success');

    // Informa ao ESP32 que o carregamento começou
    fetch('http://localhost:8000/api/hardware/1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'charging',
        customer_name: user?.name || 'Visitante',
        vehicle_model: car.model,
        station_code: station?.code ?? 'SP-001',
        battery_pct: session.startBattery,
        power_kw: chargeCalc.powerAvailable,
        energy_kwh: 0,
        cost_brl: 0,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Erro ao sincronizar ESP32');
        }
        console.log('Início enviado ao ESP32!');
      })
      .catch((error) => {
        console.error('Erro na integração ESP32:', error);
      });

  }, [car, chargeCalc, chargeTarget, tariff, startSession, addToast, station]);

  const handleChargingPause = useCallback(() => {
    addToast('Carregamento pausado', 'info');
  }, [addToast]);


const handlePaymentApproved = useCallback(() => {
  setPaymentApproved(true);
  const hardwareData = {
    customer_name: user?.name || 'Visitante',
    vehicle_model: car?.model || '',
    station_code: station?.code || '',
    battery_pct: car?.currentCharge ?? 0,
    power_kw: 0,
    energy_kwh: paymentData?.energyUsed ?? 0,
    cost_brl: paymentData?.totalCost ?? 0,
  };

  const syncHardware = async (
    status: 'paid' | 'connected'
  ) => {
    const response = await fetch(
      'http://localhost:8000/api/hardware/1/sync',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          ...hardwareData,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Falha ao sincronizar estado ${status}`
      );
    }
  };

  void (async () => {
    try {
      // 1. Mostra pagamento aprovado no LCD
      await syncHardware('paid');

      console.log('ESP32: pagamento aprovado!');

      // 2. Aguarda 4 segundos antes de voltar
      // para as informacoes do veiculo
      paymentLcdTimeoutRef.current = window.setTimeout(() => {
        if (exitingRef.current) return;
        void syncHardware('connected')
          .then(() => {
            console.log(
              'ESP32: voltou ao menu do veiculo!'
            );
          })
          .catch((error) => {
            console.error(
              'Erro ao restaurar LCD:',
              error
            );
          });
      }, 4000);

    } catch (error) {
      console.error(
        'Erro ao confirmar pagamento no ESP32:',
        error
      );
    }
  })();
}, [
  user?.name,
  car,
  station,
  paymentData,
]);


const handleChargingStop = useCallback(
  async (finalSession: ChargeSession) => {
    // 1. Encerra a sessão localmente
    endSession(finalSession);

    const wasCompleted = finalSession.status === 'completed';

    if (wasCompleted) {
      addToast(
        `Carregamento concluído! +${
          finalSession.endBattery - finalSession.startBattery
        }%`,
        'success'
      );
    } else {
      addToast(
        `Carregamento encerrado em ${finalSession.endBattery}%`,
        'warning'
      );
    }

    // 2. Salva a sessão no banco de dados
    if (dbCustomerId && dbVehicleId && station) {
      try {
        const result = await saveChargeSession({
          customer_id: dbCustomerId,
          vehicle_id: dbVehicleId,
          station_id: station.id,

          start_battery_pct: finalSession.startBattery,
          end_battery_pct: finalSession.endBattery,

          energy_used_kwh: finalSession.energyUsed,
          cost_per_kwh: finalSession.costPerKwh,
          total_cost: finalSession.totalCost,

          started_at: finalSession.timestamp,
          ended_at: new Date().toISOString(),
          duration_minutes: finalSession.duration,

          status: finalSession.status,
        });

        // 3. Prepara o pagamento
        // Funciona tanto para completed quanto para cancelled
        setPaymentApproved(false);
        setPaymentData({
          sessionId: result.session_id,
          customerId: dbCustomerId,
          totalCost: finalSession.totalCost,
          energyUsed: finalSession.energyUsed,
          duration: finalSession.duration,
        });

        setActiveSession(null);
        setScreen('payment');

        // 4. Envia o estado de pagamento ao ESP32
        // Um unico envio, sem bloquear a navegacao
        void fetch(
          'http://localhost:8000/api/hardware/1/sync',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'payment',
              customer_name: user?.name || 'Visitante',
              vehicle_model: car?.model || '',
              station_code: station.code,
              battery_pct: finalSession.endBattery,
              power_kw: 0,
              energy_kwh: finalSession.energyUsed,
              cost_brl: finalSession.totalCost,
            }),
          }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                'Falha ao sincronizar pagamento com ESP32'
              );
            }

            console.log(
              'ESP32 atualizado: aguardando pagamento!'
            );
          })
          .catch((error) => {
            console.error(
              'Erro ao atualizar LCD:',
              error
            );
          });

        return;

      } catch (err) {
        console.error(
          'Erro ao salvar sessão no backend:',
          err
        );

        addToast(
          'Sessão salva localmente, mas falhou ao sincronizar',
          'warning'
        );
      }
    } else {
      console.warn(
        'Faltam IDs do backend — sessão não sincronizada.'
      );
    }

    // 5. Fallback se nao conseguiu salvar a sessao
    setActiveSession(null);
    setScreen('dashboard');
  },
  [
    endSession,
    addToast,
    dbCustomerId,
    dbVehicleId,
    station,
    car,
    user?.name,
  ]
);


  const handleCarChargeUpdate = useCallback(
    (charge: number) => {
      updateCarCharge(charge);
    },
    [updateCarCharge]
  );

  const handleNavigate = useCallback(
    (s: Screen) => {
      if (s === screen) return;
      if (screen === 'charging' && activeSession) {
        addToast('Carregamento em andamento — encerre primeiro', 'warning');
        return;
      }
      setScreen(s);
    },
    [screen, activeSession, addToast]
  );

  const handleExit = async () => {
    // Evita dois cliques simultaneos.
    if (exitingRef.current) return;

    // Nao permite sair durante o carregamento.
    if (screen === "charging" || activeSession) {
      addToast(
        "Encerre o carregamento antes de sair.",
        "warning"
      );
      return;
    }

    // Nao permite abandonar um pagamento pendente.
    if (screen === "payment" && !paymentApproved) {
      addToast(
        "Conclua o pagamento antes de sair.",
        "warning"
      );
      return;
    }

    if (!station?.id || !station.reservation_token) {
      addToast(
        "Reserva da estação não encontrada.",
        "error"
      );
      return;
    }

    exitingRef.current = true;

    try {
      // 1. Libera a estacao no Supabase pela FastAPI.
      const response = await fetch(
        `/api/stations/${station.id}/release`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation_token: station.reservation_token,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erro ao liberar estação: HTTP ${response.status}`
        );
      }

      console.log("ESTAÇÃO LIBERADA:", station.code);

      // 2. Cancela o retorno automatico do LCD
      // para "connected" depois do pagamento.
      if (paymentLcdTimeoutRef.current !== null) {
        window.clearTimeout(paymentLcdTimeoutRef.current);
        paymentLcdTimeoutRef.current = null;
      }

      // 3. Avisa o ESP32 que nao ha motorista conectado.
      try {
        const hardwareResponse = await fetch(
          "/api/hardware/1/sync",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "waiting",
              customer_name: "",
              vehicle_model: "",
              station_code: "",
              battery_pct: 0,
              power_kw: 0,
              energy_kwh: 0,
              cost_brl: 0,
            }),
          }
        );

        if (!hardwareResponse.ok) {
          console.warn(
            "Estação liberada, mas LCD não confirmou o estado waiting."
          );
        }
      } catch (error) {
        console.error(
          "Estação liberada, mas houve erro no ESP32:",
          error
        );
      }

      // 4. Limpa apenas os dados da sessao local.
      // Nao apaga clientes, historico ou pagamentos do banco.
      localStorage.removeItem("ev_user");
      localStorage.removeItem("ev_current_session");

      // 5. Pula o splash uma vez e retorna ao login.
      sessionStorage.setItem(
        "chargegrid_return_to_login",
        "1"
      );

      window.location.reload();

    } catch (error) {
      exitingRef.current = false;

      console.error("Erro ao sair:", error);

      addToast(
        "Não foi possível liberar a estação. Tente novamente.",
        "error"
      );
    }
  };


  const handleConnectByCode = async (
    code: string,
    rfidResult?: ConnectedCustomer
  ) => {
    if (connectionInProgressRef.current) {
      throw new Error("Já existe uma conexão em andamento.");
    }

    connectionInProgressRef.current = true;

    try {

    // 1. Busca a conta e o veículo ativo pelo código
    const result = rfidResult ?? await connectByCode(code);

    const connectedVehicle = result.vehicle;

    // 2. Escolhe uma estação REAL disponível
    // e já marca ela como "occupied" no banco
    const selectedStation = await occupyRandomStation();

    if (!selectedStation.reservation_token) {
      throw new Error("A estação foi retornada sem token de reserva.");
    }



    console.log('ESTAÇÃO RESERVADA:', selectedStation);

    // 3. Guarda os IDs reais do banco
    setDbCustomerId(result.customer_id);
    setDbVehicleId(connectedVehicle.id);

    // 4. Guarda a estação escolhida no painel
    setStation(selectedStation);

    // 5. Converte o veículo do banco para Car
    const connectedCar: Car = {
      id: `car_${connectedVehicle.id}`,

      model: connectedVehicle.model,

      licensePlate: '',

      batteryCapacity: Number(
        connectedVehicle.battery_capacity_kwh
      ),

      currentCharge: Math.floor(Math.random() * 56) + 15,

      maxPower: Number(
        connectedVehicle.max_charge_power_kw ?? 0
      ),

      temperature: 25,
    };

    // 6. Salva o carro
    saveCar(connectedCar);

    // 7. Salva usuário
    saveUser({
      id: `user_${result.customer_id}`,
      name: result.first_name,
      surname: result.last_name,
      email: '',
      createdAt: new Date().toISOString(),
    });
    // Envia as informações do motorista para o ESP32
    try {
      const response = await fetch(
        'http://localhost:8000/api/hardware/1/sync',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'connected',
            customer_name: `${result.first_name} ${result.last_name}`.trim(),
            vehicle_model: connectedCar.model,
            station_code: selectedStation.code,
            battery_pct: connectedCar.currentCharge,
            power_kw: 0,
            energy_kwh: 0,
            cost_brl: 0,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao sincronizar hardware');
      }

      console.log('ESP32 sincronizado com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar ESP32:', error);
    }



    // 8. Entra no painel
    setAppPhase('app');

    addToast(
      `Conectado ao ${connectedVehicle.model} • ${selectedStation.name}`,
      'success'
    );


  } catch (err) {
    console.error("Erro ao conectar motorista:", err);
    throw err;
  } finally {
    connectionInProgressRef.current = false;
  }
};


// Mantém a função de conexão atualizada sem reiniciar
// a escuta RFID a cada renderização.
useEffect(() => {
  connectWithCodeRef.current = handleConnectByCode;
});

// Escuta cartões somente na tela de conexão.
useEffect(() => {
  if (appPhase !== "connection") return;

  let ativo = true;
  let inicializado = false;
  let ultimoEvento = 0;
  let consultando = false;

  async function verificarRFID() {
    if (
      !ativo ||
      consultando ||
      connectionInProgressRef.current
    ) {
      return;
    }

    consultando = true;

    try {
      const response = await fetch(
        `/api/hardware/1/rfid-events?after=${ultimoEvento}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Erro ao consultar RFID: HTTP ${response.status}`
        );
      }

      const data: {
        latest_id: number;
        events: { id: number; device_id: string }[];
      } = await response.json();

      if (!ativo) return;

      // Na primeira consulta, ignora cartões aproximados
      // antes de abrir a tela de conexão.
      if (!inicializado) {
        ultimoEvento = data.latest_id;
        inicializado = true;

        console.log("Leitor RFID conectado ao painel!");
        return;
      }

      for (const evento of data.events) {
        if (!ativo) return;

        if (evento.id <= ultimoEvento) continue;

        ultimoEvento = evento.id;

        if (connectionInProgressRef.current) break;

        console.log("RFID reconhecido! Evento:", evento.id);

        // Consome o evento uma única vez e recebe
        // a conta e o veículo reconhecidos.
        const loginResponse = await fetch(
          "/api/hardware/1/rfid-login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              event_id: evento.id,
            }),
          }
        );

        const resultado = await loginResponse
          .json()
          .catch(() => null);

        if (!loginResponse.ok) {
          throw new Error(
            resultado?.detail ||
            "Não foi possível identificar o cartão"
          );
        }

        if (!ativo) return;

        const customer = resultado as ConnectedCustomer;

        // Reutiliza exatamente o fluxo que já funciona
        // com código de conexão.
        if (!connectWithCodeRef.current) {
          throw new Error("Conexão ainda não disponível");
        }

        await connectWithCodeRef.current("", customer);

        console.log(
          "ChargeGrid: motorista conectado por RFID!"
        );

        break;
      }
    } catch (error) {
      console.error("Erro no login por RFID:", error);

      if (ativo) {
        addToast(
          error instanceof Error
            ? error.message
            : "Não foi possível conectar pelo cartão",
          "error"
        );
      }
    } finally {
      consultando = false;
    }
  }

  // Primeira consulta define o ponto inicial da leitura.
  void verificarRFID();

  const intervalo = window.setInterval(() => {
    void verificarRFID();
  }, 900);

  return () => {
    ativo = false;
    window.clearInterval(intervalo);
  };
}, [appPhase, addToast]);



  // ── ONBOARDING PHASES ─────────────────────────────────────────────
  if (appPhase === 'splash') {
    return <SplashScreen onLoadingComplete={handleSplashComplete} duration={3500} />;
  }
  if (appPhase === 'connection') {
  return (
    <ConnectionScreen
      onGuest={() => setAppPhase('welcome')}
      onConnect={handleConnectByCode}
    />
  );
}
  if (appPhase === 'welcome') {
  return (
    <WelcomeScreen
      onContinue={handleGuestContinue}
    />
  );
}

  // ── MAIN APP ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      <Header
        currentScreen={screen}
        onNavigate={handleNavigate}
        stationId={station?.code ?? '—'}
        userName={user?.name}
        onExit={() => void handleExit()}
      />

      <main className="max-w-lg mx-auto px-4 py-6">

      {screen === 'dashboard' && (
        <>
          {user && !user.id.startsWith('guest_') && (
            <div className="mb-5 rounded-2xl border border-blue-500/40 bg-[#153659] p-5 text-white shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💳</span>
                  <span className="font-bold">Meu Cartão Grid</span>
                </div>

                {dashboardWallet && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                    {dashboardWallet.tierName}
                  </span>
                )}
              </div>

              <p className="text-sm text-blue-200">
                Saldo disponível
              </p>

              {dashboardWalletLoading ? (
                <p className="mt-2 text-lg">Consultando saldo...</p>
              ) : dashboardWallet ? (
                <p className="mt-1 text-3xl font-bold">
                  {dashboardWallet.total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              ) : (
                <p className="mt-2 text-sm text-blue-200">
                  Saldo indisponível
                </p>
              )}

              <p className="mt-3 text-xs text-blue-200">
                Pague suas recargas com o saldo do Cartão Grid.
              </p>
            </div>
          )}

          <DashboardScreen
            car={car}
            tariff={tariff}
            onChargeClick={handleChargeClick}
            onHistoryClick={() => setScreen('history')}
            onConnectCar={handleConnectCar}
          />
        </>
      )}


        {screen === 'select' && car && (
          <SelectChargeScreen
            car={car}
            tariff={tariff}
            onBack={() => setScreen('dashboard')}
            onContinue={handleSelectContinue}
          />
        )}

        {screen === 'confirm' && car && chargeCalc && (
          <ConfirmScreen
            car={car}
            targetBattery={chargeTarget}
            calculation={chargeCalc}
            stationId={station?.code ?? 'SP-001'}
            onBack={() => setScreen('select')}
            onConfirm={handleConfirm}
          />
        )}

        {screen === 'charging' && car && activeSession && chargeCalc && (
        <ChargingScreen
          car={car}
          session={activeSession}
          calculation={chargeCalc}
          customerName={user?.name || 'Visitante'}
          onPause={handleChargingPause}
          onStop={handleChargingStop}
          onCarChargeUpdate={handleCarChargeUpdate}
        />
        )}

        {screen === 'payment' && paymentData && (
          <PaymentScreen
            sessionId={paymentData.sessionId}
            customerId={paymentData.customerId}
            totalCost={paymentData.totalCost}
            energyUsed={paymentData.energyUsed}
            duration={paymentData.duration}
            onApproved={handlePaymentApproved}
            onFinish={() => {
              setPaymentData(null);
              setPaymentApproved(false);
              setScreen('dashboard');
            }}
            onExit={() => void handleExit()}
          />
        )}


        {screen === 'history' && (
          <HistoryScreen
            history={history}
            onClearHistory={clearAllHistory}
            onBack={() => setScreen('dashboard')}
          />
        )}


      <ToastContainer toasts={toasts} onClose={removeToast} />
      </main>
      <div
  style={{
    position: "fixed",
    top: 80,
    right: 20,
    zIndex: 999999,
    background: "red",
    color: "white",
    padding: 20,
  }}
>
  TESTE CHATBOT
</div>

<ChargeGridChat />
    </div>
  );
}

export default App;
