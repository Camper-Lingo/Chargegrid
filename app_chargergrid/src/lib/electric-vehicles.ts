export interface ElectricVehicleModel {
  name: string;
  batteryKwh: number;
  maxChargeKw: number;
  /** Consumo médio em kWh a cada 100 km (opcional; sem ele usamos uma estimativa) */
  consumptionKwh100km?: number;
}

// Catálogo de modelos elétricos para agilizar o cadastro. O campo continua
// aceitando texto livre para versões ou lançamentos ainda não listados.
export const ELECTRIC_VEHICLES: ElectricVehicleModel[] = [
  { name: "Abarth 500e", batteryKwh: 42, maxChargeKw: 85 },
  { name: "Audi e-tron GT", batteryKwh: 93.4, maxChargeKw: 270 },
  { name: "Audi Q4 e-tron", batteryKwh: 82, maxChargeKw: 175 },
  { name: "Audi Q6 e-tron", batteryKwh: 100, maxChargeKw: 270 },
  { name: "Audi Q8 e-tron", batteryKwh: 114, maxChargeKw: 170 },
  { name: "BMW i4", batteryKwh: 83.9, maxChargeKw: 205 },
  { name: "BMW i5", batteryKwh: 84.3, maxChargeKw: 205 },
  { name: "BMW i7", batteryKwh: 105.7, maxChargeKw: 195 },
  { name: "BMW iX", batteryKwh: 111.5, maxChargeKw: 195 },
  { name: "BMW iX1", batteryKwh: 66.5, maxChargeKw: 130 },
  { name: "BMW iX2", batteryKwh: 66.5, maxChargeKw: 130 },
  { name: "BYD Dolphin", batteryKwh: 44.9, maxChargeKw: 60 },
  { name: "BYD Dolphin Mini", batteryKwh: 38, maxChargeKw: 40 },
  { name: "BYD Dolphin Plus", batteryKwh: 60.5, maxChargeKw: 80 },
  { name: "BYD Han", batteryKwh: 85.4, maxChargeKw: 120 },
  { name: "BYD King", batteryKwh: 18.3, maxChargeKw: 6.6 },
  { name: "BYD Seal", batteryKwh: 82.6, maxChargeKw: 150 },
  { name: "BYD Song Plus", batteryKwh: 18.3, maxChargeKw: 6.6 },
  { name: "BYD Tan", batteryKwh: 108.8, maxChargeKw: 170 },
  { name: "Caoa Chery iCar", batteryKwh: 30.8, maxChargeKw: 50 },
  { name: "Chevrolet Blazer EV", batteryKwh: 102, maxChargeKw: 190 },
  { name: "Chevrolet Bolt EV", batteryKwh: 66, maxChargeKw: 55 },
  { name: "Chevrolet Equinox EV", batteryKwh: 85, maxChargeKw: 150 },
  { name: "Citroën ë-C3", batteryKwh: 29.2, maxChargeKw: 100 },
  { name: "Fiat 500e", batteryKwh: 42, maxChargeKw: 85 },
  { name: "Ford F-150 Lightning", batteryKwh: 131, maxChargeKw: 155 },
  { name: "Ford Mustang Mach-E", batteryKwh: 91, maxChargeKw: 150 },
  { name: "GAC Aion ES", batteryKwh: 55.2, maxChargeKw: 60 },
  { name: "GAC Aion V", batteryKwh: 75.3, maxChargeKw: 180 },
  { name: "GAC Hyptec HT", batteryKwh: 83.3, maxChargeKw: 280 },
  { name: "GWM Ora 03 GT", batteryKwh: 63, maxChargeKw: 67 },
  { name: "GWM Ora 03 Skin", batteryKwh: 48, maxChargeKw: 64 },
  { name: "Honda e:Ny1", batteryKwh: 68.8, maxChargeKw: 78 },
  { name: "Hyundai Ioniq 5", batteryKwh: 84, maxChargeKw: 260 },
  { name: "Hyundai Ioniq 6", batteryKwh: 77.4, maxChargeKw: 233 },
  { name: "Hyundai Kona Electric", batteryKwh: 64.8, maxChargeKw: 102 },
  { name: "JAC E-JS1", batteryKwh: 30.2, maxChargeKw: 50 },
  { name: "JAC E-JS4", batteryKwh: 55, maxChargeKw: 100 },
  { name: "Jaguar I-Pace", batteryKwh: 90, maxChargeKw: 100 },
  { name: "Jeep Avenger", batteryKwh: 54, maxChargeKw: 100 },
  { name: "Kia EV3", batteryKwh: 81.4, maxChargeKw: 128 },
  { name: "Kia EV5", batteryKwh: 88.1, maxChargeKw: 141 },
  { name: "Kia EV6", batteryKwh: 84, maxChargeKw: 258 },
  { name: "Kia EV9", batteryKwh: 99.8, maxChargeKw: 210 },
  { name: "Kia Niro EV", batteryKwh: 64.8, maxChargeKw: 80 },
  { name: "Leapmotor C10", batteryKwh: 69.9, maxChargeKw: 84 },
  { name: "Lotus Eletre", batteryKwh: 112, maxChargeKw: 350 },
  { name: "Mercedes-Benz EQA", batteryKwh: 70.5, maxChargeKw: 100 },
  { name: "Mercedes-Benz EQB", batteryKwh: 70.5, maxChargeKw: 100 },
  { name: "Mercedes-Benz EQE", batteryKwh: 90.6, maxChargeKw: 170 },
  { name: "Mercedes-Benz EQS", batteryKwh: 118, maxChargeKw: 200 },
  { name: "Mercedes-Benz EQS SUV", batteryKwh: 118, maxChargeKw: 200 },
  { name: "MG4 Electric", batteryKwh: 64, maxChargeKw: 140 },
  { name: "Mini Cooper SE", batteryKwh: 54.2, maxChargeKw: 95 },
  { name: "Neta Aya", batteryKwh: 40.7, maxChargeKw: 60 },
  { name: "Neta X", batteryKwh: 62, maxChargeKw: 80 },
  { name: "Nissan Ariya", batteryKwh: 87, maxChargeKw: 130 },
  { name: "Nissan Leaf", batteryKwh: 40, maxChargeKw: 50 },
  { name: "Peugeot e-2008", batteryKwh: 50, maxChargeKw: 100 },
  { name: "Peugeot e-208", batteryKwh: 50, maxChargeKw: 100 },
  { name: "Polestar 2", batteryKwh: 82, maxChargeKw: 205 },
  { name: "Porsche Macan Electric", batteryKwh: 100, maxChargeKw: 270 },
  { name: "Porsche Taycan", batteryKwh: 105, maxChargeKw: 320 },
  { name: "Renault Kwid E-Tech", batteryKwh: 26.8, maxChargeKw: 30 },
  { name: "Renault Megane E-Tech", batteryKwh: 60, maxChargeKw: 130 },
  { name: "Renault Scenic E-Tech", batteryKwh: 87, maxChargeKw: 150 },
  { name: "Seres 3", batteryKwh: 53.6, maxChargeKw: 50 },
  { name: "Tesla Model 3", batteryKwh: 60, maxChargeKw: 170 },
  { name: "Tesla Model 3 Long Range", batteryKwh: 79, maxChargeKw: 250 },
  { name: "Tesla Model S", batteryKwh: 100, maxChargeKw: 250 },
  { name: "Tesla Model X", batteryKwh: 100, maxChargeKw: 250 },
  { name: "Tesla Model Y", batteryKwh: 60, maxChargeKw: 175 },
  { name: "Tesla Model Y Long Range", batteryKwh: 79, maxChargeKw: 250 },
  { name: "Volvo C40 Recharge", batteryKwh: 78, maxChargeKw: 150 },
  { name: "Volvo EX30", batteryKwh: 51, maxChargeKw: 134 },
  { name: "Volvo EX30 Extended Range", batteryKwh: 69, maxChargeKw: 153 },
  { name: "Volvo EX40", batteryKwh: 78, maxChargeKw: 150 },
  { name: "Volvo EX90", batteryKwh: 111, maxChargeKw: 250 },
  { name: "Volkswagen ID.3", batteryKwh: 58, maxChargeKw: 120 },
  { name: "Volkswagen ID.4", batteryKwh: 77, maxChargeKw: 175 },
  { name: "Volkswagen ID. Buzz", batteryKwh: 84, maxChargeKw: 200 },
  { name: "Zeekr 001", batteryKwh: 100, maxChargeKw: 200 },
  { name: "Zeekr X", batteryKwh: 69, maxChargeKw: 150 },
].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

// ── Consumo (kWh/100 km) ────────────────────────────────────────────
// Valores APROXIMADOS de uso misto, para o planejador de viagem.
// Confira/atualize com a tabela PBEV do Inmetro ou a ficha do fabricante.
const KNOWN_CONSUMPTION: Record<string, number> = {
  "BYD Dolphin Mini": 13,
  "BYD Dolphin": 14.5,
  "BYD Dolphin Plus": 15.5,
  "BYD Seal": 16,
  "BYD Tan": 21,
  "Renault Kwid E-Tech": 12,
  "Caoa Chery iCar": 12.5,
  "JAC E-JS1": 12.5,
  "Citroën ë-C3": 15,
  "Chevrolet Bolt EV": 16,
  "Nissan Leaf": 16,
  "Peugeot e-208": 15.5,
  "Peugeot e-2008": 16.5,
  "Volvo EX30": 16.5,
  "Volvo EX30 Extended Range": 17,
  "Tesla Model 3": 14,
  "Tesla Model 3 Long Range": 14.5,
  "Tesla Model Y": 15.5,
  "Tesla Model Y Long Range": 16,
  "Hyundai Ioniq 5": 18,
  "Hyundai Ioniq 6": 15,
  "Kia EV6": 17.5,
  "Ford F-150 Lightning": 28,
};

/** Consumo padrão quando o modelo não é conhecido, pelo tamanho da bateria. */
function estimateFromBattery(batteryKwh: number) {
  if (batteryKwh < 45) return 13.5;
  if (batteryKwh < 75) return 16;
  if (batteryKwh < 95) return 18.5;
  return 21.5;
}

export const DEFAULT_CONSUMPTION_KWH_100KM = 16;

export function findVehicleModel(name: string | null | undefined) {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return ELECTRIC_VEHICLES.find((v) => v.name.toLowerCase() === key);
}

/**
 * Consumo do veículo em kWh/100 km.
 * `estimated` = true quando é um valor estimado (modelo fora da tabela).
 */
export function vehicleConsumption(
  modelName: string | null | undefined,
  batteryKwh?: number,
): { kwhPer100km: number; estimated: boolean } {
  const model = findVehicleModel(modelName);
  const known = model?.consumptionKwh100km ?? (model ? KNOWN_CONSUMPTION[model.name] : undefined);
  if (known) return { kwhPer100km: known, estimated: false };
  const battery = batteryKwh ?? model?.batteryKwh;
  return {
    kwhPer100km: battery ? estimateFromBattery(battery) : DEFAULT_CONSUMPTION_KWH_100KM,
    estimated: true,
  };
}
