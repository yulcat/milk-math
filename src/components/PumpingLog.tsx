import { useState, useEffect, useRef, useCallback } from 'react';
import type { PumpingSession } from '../types';
import { getSessions, addSession, deleteSession } from '../utils/storage';
import { today, formatTime, formatDuration, generateId, now } from '../utils/date';
import { useWakeLock } from '../hooks/useWakeLock';

export default function PumpingLog() {
  const [sessions, setSessions] = useState<PumpingSession[]>([]);
  const [leftMl, setLeftMl] = useState('');
  const [rightMl, setRightMl] = useState('');
  const [notes, setNotes] = useState('');

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const reload = useCallback(() => setSessions(getSessions()), []);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isTimerRunning]);

  const startTimer = async () => {
    setTimerSeconds(0);
    setTimerStartTime(now());
    setIsTimerRunning(true);
    await requestWakeLock();
  };

  const stopTimer = async () => {
    setIsTimerRunning(false);
    await releaseWakeLock();
  };

  const handleSave = () => {
    const left = parseInt(leftMl) || 0;
    const right = parseInt(rightMl) || 0;
    if (left === 0 && right === 0) return;

    const session: PumpingSession = {
      id: generateId(),
      date: today(),
      startTime: timerStartTime || now(),
      endTime: now(),
      durationSeconds: timerSeconds || undefined,
      leftMl: left,
      rightMl: right,
      totalMl: left + right,
      notes,
    };
    addSession(session);
    setLeftMl('');
    setRightMl('');
    setNotes('');
    setTimerSeconds(0);
    setTimerStartTime(null);
    reload();
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    reload();
  };

  const todaySessions = sessions.filter(s => s.date === today());
  const todayTotal = todaySessions.reduce((sum, s) => sum + s.totalMl, 0);

  const thisWeekSessions = sessions.filter(s => {
    const d = new Date(s.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  const weekTotal = thisWeekSessions.reduce((sum, s) => sum + s.totalMl, 0);
  const avgPerSession = thisWeekSessions.length > 0
    ? Math.round(weekTotal / thisWeekSessions.length) : 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-warm-gray dark:text-dark-muted">오늘 총 유축량</p>
          <p className="text-2xl font-bold text-sage-dark dark:text-sage">{todayTotal}ml</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-warm-gray dark:text-dark-muted">이번 주 평균</p>
          <p className="text-2xl font-bold text-warm-dark dark:text-dark-text">{avgPerSession}ml<span className="text-sm font-normal">/회</span></p>
        </div>
      </div>

      {/* Week total */}
      <div className="bg-sage-light/50 dark:bg-sage-dark/20 rounded-2xl p-4">
        <p className="text-sm text-sage-dark dark:text-sage">이번 주 총 유축량: <span className="font-bold text-lg">{weekTotal}ml</span> ({thisWeekSessions.length}회)</p>
      </div>

      {/* Timer */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm text-center">
        <p className="text-4xl font-mono font-bold mb-4 text-warm-dark dark:text-dark-text tabular-nums">
          {formatDuration(timerSeconds)}
        </p>
        {!isTimerRunning ? (
          <button
            onClick={startTimer}
            className="bg-sage hover:bg-sage-dark text-white font-bold py-3 px-8 rounded-full text-lg transition-colors min-h-[44px]"
          >
            유축 시작
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="bg-pink-dark hover:bg-red-soft text-white font-bold py-3 px-8 rounded-full text-lg transition-colors min-h-[44px]"
          >
            유축 종료
          </button>
        )}
      </div>

      {/* Input Form */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3 text-warm-dark dark:text-dark-text">유축량 기록</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-warm-gray dark:text-dark-muted block mb-1">왼쪽 (ml)</label>
            <input
              type="number"
              inputMode="numeric"
              value={leftMl}
              onChange={e => setLeftMl(e.target.value)}
              className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 text-center text-lg min-h-[44px]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-warm-gray dark:text-dark-muted block mb-1">오른쪽 (ml)</label>
            <input
              type="number"
              inputMode="numeric"
              value={rightMl}
              onChange={e => setRightMl(e.target.value)}
              className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 text-center text-lg min-h-[44px]"
              placeholder="0"
            />
          </div>
        </div>
        <p className="text-center text-sm text-warm-gray dark:text-dark-muted mb-3">
          합계: <span className="font-bold text-warm-dark dark:text-dark-text text-lg">{(parseInt(leftMl) || 0) + (parseInt(rightMl) || 0)}ml</span>
        </p>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 mb-3 text-sm min-h-[44px]"
          placeholder="메모 (선택)"
        />
        <button
          onClick={handleSave}
          className="w-full bg-sage hover:bg-sage-dark text-white font-bold py-3 rounded-xl transition-colors min-h-[44px]"
        >
          저장
        </button>
      </div>

      {/* Today's Sessions */}
      <div>
        <h3 className="font-bold text-sm mb-2 text-warm-dark dark:text-dark-text">오늘의 유축 기록</h3>
        {todaySessions.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 text-center shadow-sm">
            <p className="text-3xl mb-2">🍼</p>
            <p className="text-warm-gray dark:text-dark-muted text-sm">아직 오늘의 유축 기록이 없어요</p>
            <p className="text-warm-gray dark:text-dark-muted text-xs mt-1">위의 타이머를 시작해 보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todaySessions.slice().reverse().map(s => (
              <div key={s.id} className="bg-white dark:bg-dark-card rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-warm-dark dark:text-dark-text">
                    {s.totalMl}ml
                    <span className="text-xs font-normal text-warm-gray dark:text-dark-muted ml-2">
                      좌 {s.leftMl} / 우 {s.rightMl}
                    </span>
                  </p>
                  <p className="text-xs text-warm-gray dark:text-dark-muted">
                    {formatTime(s.startTime)}
                    {s.durationSeconds ? ` · ${formatDuration(s.durationSeconds)}` : ''}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-warm-gray hover:text-red-soft text-sm p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
