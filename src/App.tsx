import { useState, useEffect } from 'react';
import type { TabId } from './types';
import { getDarkMode, setDarkMode } from './utils/storage';
import PumpingLog from './components/PumpingLog';
import StashInventory from './components/StashInventory';
import Dashboard from './components/Dashboard';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'pumping', label: '유축일지', icon: '🍼' },
  { id: 'stash', label: '재고관리', icon: '📦' },
  { id: 'dashboard', label: '수급현황', icon: '📊' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('pumping');
  const [dark, setDark] = useState(getDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    setDarkMode(dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1a1a2e' : '#fdf6f0');
  }, [dark]);

  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-dark-bg text-dark-text' : 'bg-cream text-warm-dark'}`}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-cream/80 dark:bg-dark-bg/80 border-b border-cream-dark/30 dark:border-dark-surface/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">
            <span className="text-pink-dark dark:text-pink">밀크</span>
            <span className="text-sage-dark dark:text-sage">매스</span>
          </h1>
          <button
            onClick={() => setDark(!dark)}
            className="text-xl p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="다크 모드 전환"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24 scrollbar-hide overflow-y-auto">
        {activeTab === 'pumping' && <PumpingLog />}
        {activeTab === 'stash' && <StashInventory />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-white/90 dark:bg-dark-card/90 border-t border-cream-dark/30 dark:border-dark-surface/50 pb-safe">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 min-h-[60px] transition-colors ${
                activeTab === tab.id
                  ? 'text-sage-dark dark:text-sage'
                  : 'text-warm-gray dark:text-dark-muted'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-xs mt-0.5 ${activeTab === tab.id ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
