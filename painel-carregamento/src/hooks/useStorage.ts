import { useState, useCallback, useEffect } from 'react';

import type { Car, ChargeSession, User } from '../types';

import { storageService } from '../services/storageService';

export const useStorage = (customerId: number | null) => {
  const [car, setCarState] = useState<Car | null>(null);

  const [user, setUserState] = useState<User | null>(null);

  const [history, setHistory] = useState<ChargeSession[]>([]);

  const [currentSession, setCurrentSessionState] =
    useState<ChargeSession | null>(null);

  useEffect(() => {
  if (customerId) {
    setHistory(storageService.getHistory(customerId));
  } else {
    setHistory([]);
  }
}, [customerId]);

  const saveCar = useCallback((newCar: Car) => {
    setCarState(newCar);
  }, []);

  const saveUser = useCallback((newUser: User) => {
    setUserState(newUser);
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
  }, []);

  const updateCarCharge = useCallback((newCharge: number) => {
    setCarState((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        currentCharge: Math.round(newCharge),
      };
    });
  }, []);

  const saveCharge = useCallback(
  (session: ChargeSession) => {
    if (!customerId) return;

    storageService.addChargeToHistory(
      session,
      customerId
    );

    setHistory(
      storageService.getHistory(customerId)
    );
  },
  [customerId]
);

  const startSession = useCallback((session: ChargeSession) => {
    setCurrentSessionState(session);
  }, []);

  const updateSession = useCallback(
    (updatedSession: ChargeSession) => {
      setCurrentSessionState(updatedSession);
    },
    []
  );

  const endSession = useCallback(
  (finalSession: ChargeSession) => {
    if (customerId) {
      storageService.addChargeToHistory(
        finalSession,
        customerId
      );

      setHistory(
        storageService.getHistory(customerId)
      );
    }

    setCurrentSessionState(null);
  },
  [customerId]
);

  const getHistoryFiltered = useCallback(
  (days: number) => {
    if (!customerId) return [];

    return storageService.getHistory(
      customerId,
      days
    );
  },
  [customerId]
);

  const clearAllHistory = useCallback(() => {
  if (!customerId) return;

  storageService.clearHistory(customerId);
  setHistory([]);
}, [customerId]);

  return {
    car,
    user,
    history,
    currentSession,
    saveCar,
    saveUser,
    clearUser,
    updateCarCharge,
    saveCharge,
    startSession,
    updateSession,
    endSession,
    getHistoryFiltered,
    clearAllHistory,
  };
};