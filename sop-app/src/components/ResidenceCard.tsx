import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function ResidenceCard({ store, today, update }: { store: Store; today: string; update: Upd }) {
  const left = daysBetween(today, CONFIG.residenceExpiry);
  const done = CARD_STEPS.filter((s) => store.card[s.id]).length;
  return (
    <details className="card" open={!store.card.submit}>
      <summary>
        <h2>🪪 在留卡更新</h2>
        <span className="count">
          {done} / {CARD_STEPS.length}
        </span>
      </summary>
      <p className="hint">
        12 月 17 日到期，还有 <b>{left}</b> 天。到期前递交申请，等结果期间也可以合法留在日本。具体材料以入管官网为准。
      </p>
      <ul className="list">
        {CARD_STEPS.map((step) => {
          const late = step.by && !store.card[step.id] && daysBetween(today, step.by) < 0;
          return (
            <li key={step.id}>
              <button
                type="button"
                className="item"
                role="checkbox"
                aria-checked={!!store.card[step.id]}
                onClick={() => update((s) => void (s.card[step.id] = !s.card[step.id]))}
              >
                <span className="box">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
                <span className="txt">
                  <span className="t">{step.text}</span>
                </span>
                <span className={`time ${late ? 'late' : ''}`}>{step.by ? `${step.by.slice(5).replace('-', '/')} 前` : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
