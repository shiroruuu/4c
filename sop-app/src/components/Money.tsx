import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function Money({ store, today, update }: { store: Store; today: string; update: Upd }) {
  const ym = today.slice(0, 7);
  const month = Number(today.slice(5, 7));
  const dom = Number(today.slice(8, 10));
  const m = store.money[ym] ?? { done: {} };
  const debit = m.debit ?? 0;
  const totalB = CONFIG.rent + debit;
  const daysNeeded = Math.max(1, Math.ceil(totalB / CONFIG.withdrawLimit));
  const even = month % 2 === 0;
  const steps: [string, string][] = [
    ['income', '20 号：生活费到账'],
    ['cardB', `卡 B 存好 ${yen(totalB)}（房租 + 借记卡）`],
    ...(even ? ([['cardA', `卡 A 存好水费 ${yen(CONFIG.waterFee)}（双数月）`]] as [string, string][]) : []),
    ['bill', '25 号前：在短信里交电费和煤气费'],
    ['check', '26–27 号：确认房租、卡、水费都扣款成功'],
  ];
  const setM = (fn: (x: { debit?: number; done: Record<string, boolean> }) => void) =>
    update((s) => {
      s.money[ym] = s.money[ym] ?? { done: {} };
      fn(s.money[ym]);
    });
  return (
    <details className="card" open={dom >= 20 && dom <= 27}>
      <summary>
        <h2>💴 这个月的钱</h2>
        <span className="count">
          {steps.filter(([id]) => m.done[id]).length} / {steps.length}
        </span>
      </summary>
      <label className="field">
        <span>这个月借记卡要扣多少？</span>
        <input
          id="debit"
          type="number"
          inputMode="numeric"
          min={0}
          value={m.debit ?? ''}
          placeholder="0"
          onChange={(e) => setM((x) => void (x.debit = e.target.value === '' ? undefined : Number(e.target.value)))}
        />
      </label>
      <p className="hint">
        卡 B 一共要存 <b>{yen(totalB)}</b>
        {daysNeeded > 1 ? `，每天最多取 20 万，要分 ${daysNeeded} 天存，最晚 ${25 - daysNeeded + 1} 号开始。` : '，一天就能存完。'}
      </p>
      <ul className="list">
        {steps.map(([id, text]) => (
          <li key={id}>
            <button
              type="button"
              className="item"
              role="checkbox"
              aria-checked={!!m.done[id]}
              onClick={() => setM((x) => void (x.done[id] = !x.done[id]))}
            >
              <span className="box">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              </span>
              <span className="txt">
                <span className="t">{text}</span>
              </span>
              <span />
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
