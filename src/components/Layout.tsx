import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckCircle2, Calendar, BarChart3, Settings } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] pb-20 font-sans">
      <main className="max-w-md mx-auto px-6 pt-12">
        {children}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <TabLink to="/today" icon={<CheckCircle2 size={24} />} label="Today" />
          <TabLink to="/calendar" icon={<Calendar size={24} />} label="Calendar" />
          <TabLink to="/statistics" icon={<BarChart3 size={24} />} label="Statistics" />
          <TabLink to="/settings" icon={<Settings size={24} />} label="Settings" />
        </div>
      </nav>
    </div>
  );
};

const TabLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 transition-colors",
          isActive ? "text-black" : "text-black/30"
        )
      }
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </NavLink>
  );
};
