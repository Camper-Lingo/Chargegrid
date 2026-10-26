import type { ChargeSession, Tariff } from '../types';

class StorageService {
  private readonly KEYS = {
    HISTORY: 'ev_history',
    TARIFFS: 'ev_tariffs',
  };

  // ── History ───────────────────────────────────────────────────────
  // ── History ───────────────────────────────────────────────────────

private getHistoryKey(customerId: number): string {
  return `${this.KEYS.HISTORY}_${customerId}`;
}

addChargeToHistory(
  session: ChargeSession,
  customerId: number
): void {
  const history = this.getHistory(customerId);

  history.unshift(session);

  localStorage.setItem(
    this.getHistoryKey(customerId),
    JSON.stringify(history)
  );
}

getHistory(
  customerId: number,
  filterDays?: number
): ChargeSession[] {
  const data = localStorage.getItem(
    this.getHistoryKey(customerId)
  );

  let history: ChargeSession[] = data
    ? JSON.parse(data)
    : [];

  if (filterDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterDays);

    history = history.filter(
      (s) => new Date(s.timestamp) >= cutoff
    );
  }

  return history.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );
}

clearHistory(customerId: number): void {
  localStorage.removeItem(
    this.getHistoryKey(customerId)
  );
}


  // ── Tariffs ───────────────────────────────────────────────────────

  setTariffs(tariffs: Tariff): void {
    localStorage.setItem(
      this.KEYS.TARIFFS,
      JSON.stringify(tariffs)
    );
  }

  getTariffs(): Tariff | null {
    const data = localStorage.getItem(this.KEYS.TARIFFS);

    return data ? JSON.parse(data) : null;
  }
}

export const storageService = new StorageService();
