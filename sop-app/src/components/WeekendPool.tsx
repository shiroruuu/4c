import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function WeekendPool({
  store, today, update, markLast,
}: { store: Store; today: string; update: Upd; markLast: (s: Store, k: string, on: boolean) => void }) {
  const wk = mondayOf(today);
  const done = store.weekly[wk] ?? {};
  const sheetsState = periodicStatus(PERIODIC.find((p) => p.id === 'sheets')!, store.last.sheets, today).state;
  const sheetsWeek = sheetsState === 'soon' || sheetsState === 'due';
  const items: [string, string][] = [
    ['trash', '🗑 倒干垃圾'],
    ['vacuum', '🧹 吸尘'],
    ['airfryer', '🍳 清洗空气炸锅'],
  ];
  if (!sheetsWeek) items.push(['towels', '🛁 洗浴巾 + 浴袍 + 枕套 + 靠枕套（在上面选「洗衣：浴巾浴袍」）']);
  const toggle = (id: string) =>
    update((s) => {
      s.weekly[wk] = s.weekly[wk] ?? {};
      const on = !s.weekly[wk][id];
      s.weekly[wk][id] = on;
      if (id === 'towels') markLast(s, 'towels', on);
    });
  const dow = dowOf(today);
  const isWeekendish = dow === 0 || dow >= 5;
  return (
    <details className="card" open={isWeekendish}>
      <summary>
        <h2>🧹 这个周末的家务</h2>
        <span className="count">
          {items.filter(([id]) => done[id]).length} / {items.length}
        </span>
      </summary>
      <p className="hint">周六周日哪天有空就做一件，周末结束前做完就行。</p>
      <ul className="list">
        {items.map(([id, text]) => (
          <li key={id}>
            <button type="button" className="item" role="checkbox" aria-checked={!!done[id]} onClick={() => toggle(id)}>
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
      {sheetsWeek && <p className="hint">这周要洗床单，浴巾浴袍放在洗床品的前一天洗，枕套靠枕套跟床单一起。</p>}
    </details>
  );
}
