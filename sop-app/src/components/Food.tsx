import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function Food({ store, today, update }: { store: Store; today: string; update: Upd }) {
  const dd = dishDay(store, today);
  const d = store.days[today];
  return (
    <section className="card">
      <h2>🍚 冰箱里</h2>
      <div className="stats">
        <div>
          <b>{store.food.dishOn ? `第 ${dd} 天` : '—'}</b>
          <span>菜（够吃 3–4 天）</span>
        </div>
        <div>
          <b>{store.food.riceLeft} 份</b>
          <span>冻饭</span>
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() =>
            update((s) => {
              const day = s.days[today];
              day.riceCooked = !day.riceCooked;
              if (day.riceCooked) {
                day.prev = { ...(day.prev ?? {}), rice: String(s.food.riceLeft) };
                s.food.riceLeft = 5;
              } else if (day.prev?.rice !== undefined) {
                s.food.riceLeft = Number(day.prev.rice);
                delete day.prev.rice;
              }
            })
          }
        >
          {d?.riceCooked ? '✓ 今天煮了饭（冻 5 份）' : '今天煮了一锅饭'}
        </button>
        <button type="button" className="btn ghost" onClick={() => update((s) => void (s.food.riceLeft = Math.max(0, s.food.riceLeft - 1)))}>
          饭 −1
        </button>
        <button type="button" className="btn ghost" onClick={() => update((s) => void (s.food.riceLeft += 1))}>
          饭 +1
        </button>
      </div>
      <p className="hint">做了菜就在上面点「今天做菜」。吃晚饭打勾时，冻饭会自动减一份（点外卖和周六不减）。</p>
    </section>
  );
}
