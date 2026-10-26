// src/components/Layout/Header.tsx

import React from 'react';
import { LogOut, History, LayoutDashboard } from 'lucide-react';
import type { Screen } from '../../types';


interface HeaderProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  stationId?: string;
  onExit: () => void;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  stationId,
  userName,
  onExit,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#1A1A1A]/90 backdrop-blur-md border-b border-[#3A3A3A]">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between relative">

        {/* Logo */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 group"
          id="logo-btn"
        >
          <div className="w-9 h-9 flex items-center justify-center">
            <img
              src="/logo_goodwe.png"
              alt="GoodWe"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="hidden sm:block">
            <div className="font-bold text-[#F5F5F5] text-sm leading-tight">
              EV Station
            </div>

            <div className="text-[#A0A0A0] text-xs">
              Estação {stationId}
            </div>
          </div>
        </button>

        {/* Welcome - centro absoluto da página */}
        {userName && (
          <div className="absolute left-1/2 -translate-x-1/2 text-[#00D084] text-sm font-medium whitespace-nowrap">
            Bem-vindo, {userName}! 👋
          </div>
        )}

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavBtn
            id="nav-dashboard"
            icon={<LayoutDashboard size={16} />}
            label="Painel"
            active={currentScreen === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
          />

          <NavBtn
            id="nav-history"
            icon={<History size={16} />}
            label="Histórico"
            active={currentScreen === 'history'}
            onClick={() => onNavigate('history')}
          />


          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>

        </nav>
      </div>
    </header>
  );
};

interface NavBtnProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}

const NavBtn: React.FC<NavBtnProps> = ({
  id,
  icon,
  label,
  active,
  onClick,
  title,
}) => (
  <button
    id={id}
    title={title || label}
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
      ${
        active
          ? 'bg-[#1E90FF]/20 text-[#1E90FF]'
          : 'text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-[#2E2E2E]'
      }`}
  >
    {icon}
    {label && <span className="hidden sm:inline">{label}</span>}
  </button>
);
