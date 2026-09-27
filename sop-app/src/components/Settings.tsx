import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function Settings({ store, update }: { store: Store; update: Upd }) {
  return (
    <details className="card">
      <summary>
        <h2>⚙️ 设置</h2>
      </summary>
      <div className="seg-label wide">配色</div>
      <div className="themes" role="group" aria-label="配色">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="theme"
            aria-pressed={store.settings.theme === t.id}
            onClick={() => update((s) => void (s.settings.theme = t.id))}
          >
            <span className="pills">
              {t.swatches.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="tname">{t.name}</span>
          </button>
        ))}
      </div>
      <Segment
        label="季节"
        value={store.settings.season}
        onChange={(v) => update((s) => void (s.settings.season = v as Store['settings']['season']))}
        options={[
          ['auto', '按气温自动'],
          ['summer', '夏天'],
          ['winter', '冬天'],
        ]}
      />
      <p className="hint">自动：最高气温低于 {CONFIG.winterMaxTemp}° 就按冬天算。</p>
      <div className="row">
        <Toggle on={store.settings.weekSwap} onClick={() => update((s) => void (s.settings.weekSwap = !s.settings.weekSwap))}>
          冬天第一周 / 第二周对调
        </Toggle>
      </div>
      <p className="hint">第一周洗澡是周一、三、五、日，第二周是周二、四、日。如果算反了，点一下上面这个开关。</p>
    </details>
  );
}
