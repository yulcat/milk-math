import { useState, useEffect, useCallback } from 'react';
import type { StashBag } from '../types';
import { getStash, addStashBag, updateStashBag, deleteStashBag } from '../utils/storage';
import { today, formatDate, daysBetween, generateId, now } from '../utils/date';

export default function StashInventory() {
  const [stash, setStash] = useState<StashBag[]>([]);
  const [volumeMl, setVolumeMl] = useState('');
  const [location, setLocation] = useState<'fridge' | 'freezer'>('fridge');
  const [datePumped, setDatePumped] = useState(today());
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = useCallback(() => setStash(getStash()), []);
  useEffect(() => { reload(); }, [reload]);

  const activeStash = stash.filter(b => !b.used);
  const fridgeStash = activeStash.filter(b => b.location === 'fridge');
  const freezerStash = activeStash.filter(b => b.location === 'freezer');
  const totalFridge = fridgeStash.reduce((s, b) => s + b.volumeMl, 0);
  const totalFreezer = freezerStash.reduce((s, b) => s + b.volumeMl, 0);
  const totalStash = totalFridge + totalFreezer;

  // Sort by oldest first (FIFO)
  const sortedFridge = [...fridgeStash].sort((a, b) => a.datePumped.localeCompare(b.datePumped));
  const sortedFreezer = [...freezerStash].sort((a, b) => a.datePumped.localeCompare(b.datePumped));

  const isExpired = (bag: StashBag): boolean => {
    const days = daysBetween(bag.datePumped);
    if (bag.location === 'fridge') return days >= 4;
    return days >= 180; // 6 months
  };

  const isExpiringSoon = (bag: StashBag): boolean => {
    const days = daysBetween(bag.datePumped);
    if (bag.location === 'fridge') return days >= 3;
    return days >= 150;
  };

  // Estimate how many days the stash will last
  // Use consumption data from the last 7 days for average
  const estimateDaysLeft = (): string => {
    // simple estimate: average 800ml/day for twins
    const dailyAvg = 800;
    if (totalStash === 0) return '0';
    return Math.round(totalStash / dailyAvg).toString();
  };

  const handleSave = () => {
    const vol = parseInt(volumeMl) || 0;
    if (vol <= 0) return;

    if (editingId) {
      const bag = stash.find(b => b.id === editingId);
      if (bag) {
        updateStashBag({ ...bag, volumeMl: vol, location, datePumped, notes });
      }
      setEditingId(null);
    } else {
      addStashBag({
        id: generateId(),
        datePumped,
        dateAdded: now(),
        volumeMl: vol,
        location,
        notes,
        used: false,
      });
    }
    setVolumeMl('');
    setNotes('');
    setDatePumped(today());
    reload();
  };

  const handleEdit = (bag: StashBag) => {
    setEditingId(bag.id);
    setVolumeMl(bag.volumeMl.toString());
    setLocation(bag.location);
    setDatePumped(bag.datePumped);
    setNotes(bag.notes);
  };

  const handleMarkUsed = (id: string) => {
    const bag = stash.find(b => b.id === id);
    if (bag) {
      updateStashBag({ ...bag, used: true, usedDate: now() });
      reload();
    }
  };

  const handleDelete = (id: string) => {
    deleteStashBag(id);
    reload();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setVolumeMl('');
    setNotes('');
    setDatePumped(today());
  };

  const renderBag = (bag: StashBag) => {
    const expired = isExpired(bag);
    const expiringSoon = !expired && isExpiringSoon(bag);
    const days = daysBetween(bag.datePumped);

    return (
      <div
        key={bag.id}
        className={`rounded-xl p-3 shadow-sm flex items-center justify-between ${
          expired ? 'bg-red-soft/10 border border-red-soft/30' :
          expiringSoon ? 'bg-amber/10 border border-amber/30' :
          'bg-white dark:bg-dark-card'
        }`}
      >
        <div className="flex-1">
          <p className="font-bold text-warm-dark dark:text-dark-text">
            {bag.volumeMl}ml
            {expired && <span className="text-xs text-red-soft ml-2">⚠️ 유통기한 초과</span>}
            {expiringSoon && <span className="text-xs text-amber ml-2">⏰ 곧 만료</span>}
          </p>
          <p className="text-xs text-warm-gray dark:text-dark-muted">
            {formatDate(bag.datePumped)} 유축 · {days}일 전
            {bag.notes ? ` · ${bag.notes}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleMarkUsed(bag.id)}
            className="text-sage-dark dark:text-sage text-xs p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            사용
          </button>
          <button
            onClick={() => handleEdit(bag)}
            className="text-warm-gray text-xs p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            수정
          </button>
          <button
            onClick={() => handleDelete(bag.id)}
            className="text-red-soft text-xs p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            삭제
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-xs text-warm-gray dark:text-dark-muted">총 재고</p>
          <p className="text-xl font-bold text-sage-dark dark:text-sage">{totalStash}ml</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-xs text-warm-gray dark:text-dark-muted">냉장</p>
          <p className="text-xl font-bold text-warm-dark dark:text-dark-text">{totalFridge}ml</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-xs text-warm-gray dark:text-dark-muted">냉동</p>
          <p className="text-xl font-bold text-warm-dark dark:text-dark-text">{totalFreezer}ml</p>
        </div>
      </div>

      {/* Days estimate */}
      <div className="bg-pink-light/50 dark:bg-pink-dark/20 rounded-2xl p-4 text-center">
        <p className="text-sm text-warm-dark dark:text-dark-text">
          현재 재고로 약 <span className="font-bold text-lg text-pink-dark dark:text-pink">{estimateDaysLeft()}일</span> 분량
        </p>
        <p className="text-xs text-warm-gray dark:text-dark-muted mt-1">쌍둥이 기준 하루 약 800ml 소비 추정</p>
      </div>

      {/* Add Form */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3 text-warm-dark dark:text-dark-text">
          {editingId ? '재고 수정' : '모유 팩 추가'}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-warm-gray dark:text-dark-muted block mb-1">용량 (ml)</label>
            <input
              type="number"
              inputMode="numeric"
              value={volumeMl}
              onChange={e => setVolumeMl(e.target.value)}
              className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 text-center text-lg min-h-[44px]"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-warm-gray dark:text-dark-muted block mb-1">유축일</label>
            <input
              type="date"
              value={datePumped}
              onChange={e => setDatePumped(e.target.value)}
              className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 min-h-[44px]"
            />
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setLocation('fridge')}
            className={`flex-1 py-2 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
              location === 'fridge'
                ? 'bg-sage text-white'
                : 'bg-cream-dark dark:bg-dark-surface text-warm-gray dark:text-dark-muted'
            }`}
          >
            🧊 냉장
          </button>
          <button
            onClick={() => setLocation('freezer')}
            className={`flex-1 py-2 rounded-xl font-bold text-sm min-h-[44px] transition-colors ${
              location === 'freezer'
                ? 'bg-sage text-white'
                : 'bg-cream-dark dark:bg-dark-surface text-warm-gray dark:text-dark-muted'
            }`}
          >
            ❄️ 냉동
          </button>
        </div>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-cream-dark dark:border-dark-surface dark:bg-dark-surface dark:text-dark-text rounded-xl px-3 py-2 mb-3 text-sm min-h-[44px]"
          placeholder="메모 (선택)"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-sage hover:bg-sage-dark text-white font-bold py-3 rounded-xl transition-colors min-h-[44px]"
          >
            {editingId ? '수정 완료' : '추가'}
          </button>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-4 bg-cream-dark dark:bg-dark-surface text-warm-gray dark:text-dark-muted font-bold py-3 rounded-xl min-h-[44px]"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* Fridge FIFO List */}
      <div>
        <h3 className="font-bold text-sm mb-2 text-warm-dark dark:text-dark-text">🧊 냉장 재고 ({sortedFridge.length}개)</h3>
        {sortedFridge.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 text-center shadow-sm">
            <p className="text-warm-gray dark:text-dark-muted text-sm">냉장 재고가 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedFridge.map(renderBag)}
          </div>
        )}
      </div>

      {/* Freezer FIFO List */}
      <div>
        <h3 className="font-bold text-sm mb-2 text-warm-dark dark:text-dark-text">❄️ 냉동 재고 ({sortedFreezer.length}개)</h3>
        {sortedFreezer.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 text-center shadow-sm">
            <p className="text-warm-gray dark:text-dark-muted text-sm">냉동 재고가 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedFreezer.map(renderBag)}
          </div>
        )}
      </div>
    </div>
  );
}
