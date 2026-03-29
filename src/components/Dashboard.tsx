import { useState, useEffect, useCallback, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ConsumptionEntry, DailyStats } from '../types';
import { getSessions, getConsumption, addConsumption, deleteConsumption, getStash, exportAllData, importAllData } from '../utils/storage';
import { today, getLast7Days, formatDate, generateId, currentTimeString } from '../utils/date';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [consumption, setConsumption] = useState<ConsumptionEntry[]>([]);
  const [baby, setBaby] = useState<'baby1' | 'baby2'>('baby1');
  const [breastMilkMl, setBreastMilkMl] = useState('');
  const [formulaMl, setFormulaMl] = useState('');
  const [feedNotes, setFeedNotes] = useState('');
  const [showTwinLog, setShowTwinLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => setConsumption(getConsumption()), []);
  useEffect(() => { reload(); }, [reload]);

  const sessions = getSessions();
  const stash = getStash().filter(b => !b.used);

  // Compute daily stats
  const last7 = getLast7Days();
  const dailyStats: DailyStats[] = last7.map(date => {
    const daySessions = sessions.filter(s => s.date === date);
    const dayConsumption = consumption.filter(c => c.date === date);
    const totalPumped = daySessions.reduce((s, sess) => s + sess.totalMl, 0);
    const totalBreastMilk = dayConsumption.reduce((s, c) => s + c.breastMilkMl, 0);
    const totalFormula = dayConsumption.reduce((s, c) => s + c.formulaMl, 0);
    return {
      date,
      totalPumped,
      totalBreastMilkConsumed: totalBreastMilk,
      totalFormulaConsumed: totalFormula,
      totalConsumed: totalBreastMilk + totalFormula,
    };
  });

  const todayStats = dailyStats.find(s => s.date === today()) || {
    date: today(), totalPumped: 0, totalBreastMilkConsumed: 0, totalFormulaConsumed: 0, totalConsumed: 0,
  };

  const balance = todayStats.totalPumped - todayStats.totalConsumed;
  const balanceStatus = balance > 50 ? 'surplus' : balance < -50 ? 'deficit' : 'even';

  // Recommended pumping based on gap
  const getRecommendation = () => {
    if (balanceStatus === 'surplus') return '현재 공급이 충분해요! 좋은 페이스를 유지하세요 💪';
    if (balanceStatus === 'even') return '수급 균형이 잘 맞고 있어요. 현재 유축 빈도를 유지하세요 👍';
    const gap = Math.abs(balance);
    const extraSessions = Math.ceil(gap / 80); // assume ~80ml per session
    return `하루 ${extraSessions}회 유축을 더 하면 부족분을 채울 수 있어요 📈`;
  };

  // Chart data
  const isDark = document.documentElement.classList.contains('dark');
  const chartData = {
    labels: last7.map(formatDate),
    datasets: [
      {
        label: '유축량',
        data: dailyStats.map(s => s.totalPumped),
        backgroundColor: isDark ? 'rgba(168, 197, 160, 0.7)' : 'rgba(168, 197, 160, 0.8)',
        borderRadius: 6,
      },
      {
        label: '모유 섭취',
        data: dailyStats.map(s => s.totalBreastMilkConsumed),
        backgroundColor: isDark ? 'rgba(244, 194, 194, 0.7)' : 'rgba(244, 194, 194, 0.8)',
        borderRadius: 6,
      },
      {
        label: '분유 섭취',
        data: dailyStats.map(s => s.totalFormulaConsumed),
        backgroundColor: isDark ? 'rgba(240, 198, 116, 0.7)' : 'rgba(240, 198, 116, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { size: 11 },
          color: isDark ? '#e8e0d8' : '#5c524a',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: isDark ? '#9a928a' : '#8b7e74', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: isDark ? '#9a928a' : '#8b7e74', font: { size: 11 } },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      },
    },
  };

  const handleAddConsumption = () => {
    const bm = parseInt(breastMilkMl) || 0;
    const fm = parseInt(formulaMl) || 0;
    if (bm === 0 && fm === 0) return;

    addConsumption({
      id: generateId(),
      date: today(),
      baby,
      breastMilkMl: bm,
      formulaMl: fm,
      notes: feedNotes,
      time: currentTimeString(),
    });
    setBreastMilkMl('');
    setFormulaMl('');
    setFeedNotes('');
    reload();
  };

  const handleDeleteConsumption = (id: string) => {
    deleteConsumption(id);
    reload();
  };

  const todayConsumption = consumption.filter(c => c.date === today());
  const totalStash = stash.reduce((s, b) => s + b.volumeMl, 0);

  // Export
  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milkmath-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = importAllData(ev.target?.result as string);
      if (result) {
        reload();
        alert('데이터를 성공적으로 불러왔어요!');
      } else {
        alert('데이터 불러오기에 실패했어요. 파일을 확인해 주세요.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Balance Status */}
      <div className={`rounded-2xl p-5 text-center shadow-sm ${
        balanceStatus === 'surplus' ? 'bg-sage-light/60 dark:bg-sage-dark/30' :
        balanceStatus === 'deficit' ? 'bg-pink-light/60 dark:bg-pink-dark/30' :
        'bg-amber/20 dark:bg-amber/10'
      }`}>
        <p className="text-3xl mb-1">
          {balanceStatus === 'surplus' ? '🟢' : balanceStatus === 'deficit' ? '🔴' : '🟡'}
        </p>
        <p className="font-bold text-lg text-warm-dark dark:text-dark-text">
          {balanceStatus === 'surplus' ? '공급 충분' : balanceStatus === 'deficit' ? '공급 부족' : '수급 균형'}
        </p>
        <p className="text-sm text-warm-gray dark:text-dark-muted mt-1">
          오늘 유축 {todayStats.totalPumped}ml / 소비 {todayStats.totalConsumed}ml
          {balance !== 0 && (
            <span className={balance > 0 ? ' text-sage-dark dark:text-sage' : ' text-red-soft'}>
              {' '}({balance > 0 ? '+' : ''}{balance}ml)
            </span>
          )}
        </p>
      </div>

      {/* Recommendation */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
        <p className="text-sm text-warm-dark dark:text-dark-text">{getRecommendation()}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-xs text-warm-gray dark:text-dark-muted">모유 섭취</p>
          <p className="text-lg font-bold text-pink-dark dark:text-pink">{todayStats.totalBreastMilkConsumed}ml</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-xs text-warm-gray dark:text-dark-muted">분유 보충</p>
          <p className="text-lg font-bold text-amber">{todayStats.totalFormulaConsumed}ml</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-xs text-warm-gray dark:text-dark-muted">총 재고</p>
          <p className="text-lg font-bold text-sage-dark dark:text-sage">{totalStash}ml</p>
        </div>
      </div>

      {/* 7-Day Chart */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3 text-warm-dark dark:text-dark-text">7일 수급 추이</h3>
        <div className="h-[220px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Consumption Input */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3 text-warm-dark dark:text-dark-text">수유 기록 추가</h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setBaby('baby1')}
            className={`flex-1 py-2 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
              baby === 'baby1'
                ? 'bg-pink text-white'
                : 'bg-cream-dark dark:bg-dark-surface text-warm-gray dark:text-dark-muted'
            }`}
          >
            👶 아둥이
          </button>
          <button
            onClick={() => setBaby('baby2')}
            className={`flex-1 py-2 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
              baby === 'baby2'
                ? 'bg-pink text-white'
                : 'bg-cream-dark dark:bg-dark-surface text-warm-gray dark:text-dark-muted'
            }`}
          >
            👶 바둥이
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-warm-gray dark:text-dark-muted block mb-1">모유 (ml)</label>
            <input
              type="number"
              inputMode="numeric"
              value={breastMilkMl}
              onChange={e => setBreastMilkMl(e.target.value)}
              className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 text-center text-lg min-h-[44px]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-warm-gray dark:text-dark-muted block mb-1">분유 (ml)</label>
            <input
              type="number"
              inputMode="numeric"
              value={formulaMl}
              onChange={e => setFormulaMl(e.target.value)}
              className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 text-center text-lg min-h-[44px]"
              placeholder="0"
            />
          </div>
        </div>
        <input
          type="text"
          value={feedNotes}
          onChange={e => setFeedNotes(e.target.value)}
          className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 mb-3 text-sm min-h-[44px]"
          placeholder="메모 (선택)"
        />
        <button
          onClick={handleAddConsumption}
          className="w-full bg-pink hover:bg-pink-dark text-white font-bold py-3 rounded-xl transition-colors min-h-[44px]"
        >
          기록 저장
        </button>
      </div>

      {/* Today's Consumption */}
      <div>
        <h3 className="font-bold text-sm mb-2 text-warm-dark dark:text-dark-text">오늘의 수유 기록</h3>
        {todayConsumption.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 text-center shadow-sm">
            <p className="text-3xl mb-2">👶👶</p>
            <p className="text-warm-gray dark:text-dark-muted text-sm">아직 오늘의 수유 기록이 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayConsumption.slice().reverse().map(c => (
              <div key={c.id} className="bg-white dark:bg-dark-card rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-warm-dark dark:text-dark-text">
                    {c.baby === 'baby1' ? '아둥이' : '바둥이'}
                    <span className="text-xs font-normal text-warm-gray dark:text-dark-muted ml-2">
                      {c.time}
                    </span>
                  </p>
                  <p className="text-xs text-warm-gray dark:text-dark-muted">
                    {c.breastMilkMl > 0 && `모유 ${c.breastMilkMl}ml`}
                    {c.breastMilkMl > 0 && c.formulaMl > 0 && ' + '}
                    {c.formulaMl > 0 && `분유 ${c.formulaMl}ml`}
                    {c.notes ? ` · ${c.notes}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteConsumption(c.id)}
                  className="text-warm-gray hover:text-red-soft text-sm p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Twin Log */}
      <button
        onClick={() => setShowTwinLog(!showTwinLog)}
        className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm text-left min-h-[44px]"
      >
        <p className="font-bold text-sm text-warm-dark dark:text-dark-text">
          🔗 twin-log 연동 {showTwinLog ? '▲' : '▼'}
        </p>
      </button>
      {showTwinLog && (
        <div className="bg-cream-dark/50 dark:bg-dark-surface rounded-2xl p-4">
          <p className="text-sm text-warm-gray dark:text-dark-muted">
            twin-log 연동: 오늘 아둥이/바둥이 모유 수유 기록을 참고하세요.
          </p>
          <p className="text-xs text-warm-gray dark:text-dark-muted mt-2">
            현재는 수동 입력만 지원됩니다. LocalStorage 기반 자동 연동은 추후 업데이트 예정입니다.
          </p>
        </div>
      )}

      {/* Data Management */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3 text-warm-dark dark:text-dark-text">데이터 관리</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 bg-cream-dark dark:bg-dark-surface text-warm-dark dark:text-dark-text font-bold py-3 rounded-xl min-h-[44px] text-sm"
          >
            📤 백업 내보내기
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-cream-dark dark:bg-dark-surface text-warm-dark dark:text-dark-text font-bold py-3 rounded-xl min-h-[44px] text-sm"
          >
            📥 백업 불러오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
