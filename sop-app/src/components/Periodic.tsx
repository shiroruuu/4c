import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function Periodic({ store, today, update }: { store: Store; today: string; update: Upd }) {
  return (
    <details className="card">
      <summary>
        <h2>📅 定期的事</h2>
      </summary>
      <ul className="plist">
        {PERIODIC.map((p) => {
          const st = periodicStatus(p, store.last[p.id], today);
          const status =
            st.state === 'unknown'
              ? '还没有记录'
              : st.state === 'due'
                ? `已经 ${st.since} 天，该做了`
                : st.state === 'soon'
                  ? `快到了，还有 ${st.left} 天`
                  : `${st.since} 天前做的，${st.left} 天后提醒`;
          return (
            <li key={p.id} className={st.state}>
              <div>
                <b>{p.label}</b>
                <span>
                  {status}
                  {p.note ? ` · ${p.note}` : ''}
                </span>
              </div>
              <button type="button" onClick={() => update((s) => void (s.last[p.id] = today))}>
                {p.doneLabel ?? '今天做了'}
              </button>
            </li>
          );
        })}
        <li className={store.drain >= 2 ? 'due' : 'ok'}>
          <div>
            <b>下水道</b>
            <span>这一轮堵了 {store.drain} 次，堵 2 次就刷一下</span>
          </div>
          <div className="btns">
            <button type="button" onClick={() => update((s) => void (s.drain += 1))}>
              又堵了
            </button>
            <button type="button" onClick={() => update((s) => void (s.drain = 0))}>
              刷好了
            </button>
          </div>
        </li>
      </ul>
      <p className="hint">点按钮就把「上次」记成今天。维生素、牙刷这些还没有记录的，下次做的时候点一下就开始算。</p>
    </details>
  );
}
