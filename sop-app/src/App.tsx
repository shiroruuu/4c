import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from './config';
import {
  addDays, daysBetween, DayState, dishDay, dowOf, getWeather, isRainy, isShowerDay, isSunny,
  Laundry, loadStore, logicalToday, mondayOf, periodicStatus, saveStore, seasonOf, Store, Study,
  Weather, weatherLabel, WEEKDAY, winterWeek, yen,
} from './lib';
import { buildDay, Item } from './schedule';
import { themeCss } from './themes';
import { Toggle, Segment } from './components/ui';
import { Alerts, DueList } from './components/Alerts';
import { Stuck } from './components/Stuck';
import { Food } from './components/Food';
import { WeekendPool } from './components/WeekendPool';
import { Money } from './components/Money';
import { Periodic } from './components/Periodic';
import { ResidenceCard } from './components/ResidenceCard';
import { Settings } from './components/Settings';

const LOW_TEXT: Record<string, string> = {
  'm-eat': '吃早饭 + 维生素',
  'l-lunch': '吃午饭',
  'w-meal1': '吃点东西 + 维生素',
  'd-eat': '吃晚饭（外卖也算）',
  'e-shower': '洗澡',
  'b-med': '吃药',
  'b-sleep': '睡觉',
};

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [today, setToday] = useState(logicalToday());
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherState, setWeatherState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => saveStore(store), [store]);
  useEffect(() => {
    let el = document.getElementById('theme-css');
    if (!el) {
      el = document.createElement('style');
      el.id = 'theme-css';
      document.head.appendChild(el);
    }
    el.textContent = themeCss(store.settings.theme);
  }, [store.settings.theme]);
  useEffect(() => {
    const id = setInterval(() => setToday(logicalToday()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let alive = true;
    setWeatherState('loading');
    getWeather(today).then((w) => {
      if (!alive) return;
      setWeather(w);
      setWeatherState(w ? 'ok' : 'fail');
    });
    return () => {
      alive = false;
    };
  }, [today]);

  const day: DayState = store.days[today] ?? { done: {} };
  const dow = dowOf(today);
  const isWeekend = dow === 0 || dow === 6;

  const update = (fn: (s: Store) => void) =>
    setStore((prev) => {
      const next: Store = structuredClone(prev);
      if (!next.days[today]) next.days[today] = { done: {} };
      fn(next);
      return next;
    });
  const setDay = (patch: Partial<DayState>) => update((s) => Object.assign(s.days[today], patch));

  const sections = useMemo(() => buildDay({ store, today, day, weather }), [store, today, day, weather]);
  const low = !!day.low;
  const visible = sections
    .map((sec) => ({ ...sec, items: low ? sec.items.filter((i) => i.core) : sec.items }))
    .filter((sec) => sec.items.length);
  const tasks = visible.flatMap((s) => s.items).filter((i) => i.kind !== 'free');
  const doneCount = tasks.filter((i) => day.done[i.id]).length;

  const toggleItem = (it: Item) =>
    update((s) => {
      const d = s.days[today];
      const on = !d.done[it.id];
      if (on) d.done[it.id] = true;
      else delete d.done[it.id];
      // 吃了一份冻饭
      if (it.effect === 'dinner' && !d.takeout && dow !== 6 && !d.riceCooked) {
        if (on && !d.riceUsed && s.food.riceLeft > 0) {
          s.food.riceLeft -= 1;
          d.riceUsed = true;
        } else if (!on && d.riceUsed) {
          s.food.riceLeft += 1;
          d.riceUsed = false;
        }
      }
    });

  // 记录「上次做」的日期，取消时还原
  const markLast = (s: Store, key: string, on: boolean) => {
    const d = s.days[today];
    d.prev = d.prev ?? {};
    if (on) {
      if (!(key in d.prev)) d.prev[key] = s.last[key];
      s.last[key] = today;
    } else if (key in d.prev) {
      const p = d.prev[key];
      if (p) s.last[key] = p;
      else delete s.last[key];
      delete d.prev[key];
    }
  };

  const setLaundry = (v: Laundry) =>
    update((s) => {
      const d = s.days[today];
      if (d.laundry === 'clothes') markLast(s, 'clothes', false);
      if (d.laundry === 'towels') markLast(s, 'towels', false);
      d.laundry = v;
      if (v) markLast(s, v, true);
    });

  const setBedding = (on: boolean) =>
    update((s) => {
      const d = s.days[today];
      d.bedding = on;
      if (on) d.gym = true;
      markLast(s, 'sheets', on);
      if (!on && d.quilt) {
        d.quilt = false;
        markLast(s, 'quilt', false);
      }
    });

  const setQuilt = (on: boolean) =>
    update((s) => {
      s.days[today].quilt = on;
      markLast(s, 'quilt', on);
    });

  const setCook = (on: boolean) =>
    update((s) => {
      const d = s.days[today];
      d.cook = on;
      d.prev = d.prev ?? {};
      if (on) {
        if (!('dishOn' in d.prev)) d.prev.dishOn = s.food.dishOn;
        s.food.dishOn = today;
      } else if ('dishOn' in d.prev) {
        s.food.dishOn = d.prev.dishOn;
        delete d.prev.dishOn;
      }
    });

  const w = weather?.today;
  const season = seasonOf(store, w);
  const shower = isShowerDay(store, today, w);
  const hot = !!w && w.max > CONFIG.hotTemp;

  // 这周健身次数
  const mon = mondayOf(today);
  const gymCount = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).filter((k) => store.days[k]?.gym).length;

  const cardLeft = daysBetween(today, CONFIG.residenceExpiry);
  const cardDone = !!store.card.pickup;

  return (
    <div className="wrap">
      <header className="top">
        <div className="date">
          {today} · {WEEKDAY[dow]}
        </div>
        <h1 className="hello">
          {greeting()}
          <small>{low ? '今天只做最少的事，做到就很好了。' : '一件一件来就好。'}</small>
        </h1>
        <div className="chips">
          <span className="chip">
            {weatherState === 'loading' && '天气加载中…'}
            {weatherState === 'fail' && '天气没加载出来'}
            {weatherState === 'ok' && w && `${CONFIG.location.name} ${weatherLabel(w.code)} ${w.min}–${w.max}° · 降水 ${w.rain}%`}
          </span>
          <span className="chip">
            {season === 'summer' ? '夏天：每天洗澡' : `冬天第 ${winterWeek(store, today)} 周：今天${shower ? '洗澡' : '不洗澡'}`}
          </span>
          {!cardDone && (
            <span className={`chip ${cardLeft <= 60 ? 'warn' : ''}`}>🪪 在留卡还有 {cardLeft} 天到期</span>
          )}
        </div>
        <div className="progress">
          <div className="track">
            <i style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} />
          </div>
          <span>
            {doneCount} / {tasks.length}
          </span>
        </div>
      </header>

      <section className="card switches tone-5" aria-label="今天的情况">
        <h2>今天</h2>
        <div className="row">
          <Toggle on={low} onClick={() => setDay({ low: !low })} tone="low">
            🪫 低电量模式
          </Toggle>
          {!isWeekend && (
            <>
              <Toggle on={!!day.nap} onClick={() => setDay({ nap: !day.nap })} disabled={day.study === 'interview'}>
                😴 午睡
              </Toggle>
              <Toggle on={!!day.gym} onClick={() => setDay({ gym: !day.gym })}>
                🏋️ 健身 <em>本周 {gymCount}/4</em>
              </Toggle>
            </>
          )}
          <Toggle on={!!day.cook} onClick={() => setCook(!day.cook)}>
            🍳 今天做菜
          </Toggle>
          <Toggle on={!!day.takeout} onClick={() => setDay({ takeout: !day.takeout })}>
            🥡 点外卖
          </Toggle>
        </div>
        {!isWeekend && (
          <Segment
            label="学习"
            value={day.study ?? 'korean'}
            onChange={(v) => setDay({ study: v as Study })}
            options={[
              ['korean', '自学韩语'],
              ['class', '上课'],
              ['homework', '语校作业'],
              ['interview', '面试准备'],
            ]}
          />
        )}
        <Segment
          label="洗衣"
          value={day.laundry ?? ''}
          onChange={(v) => setLaundry((v || null) as Laundry)}
          options={[
            ['', '不洗'],
            ['clothes', '衣服'],
            ['towels', '浴巾浴袍'],
          ]}
        />
        {!isWeekend && (
          <div className="row">
            <Toggle on={!!day.bedding} onClick={() => setBedding(!day.bedding)}>
              🛏 洗床品（晚上健身时烘干）
            </Toggle>
            {day.bedding && (
              <Toggle on={!!day.quilt} onClick={() => setQuilt(!day.quilt)}>
                + 空调被
              </Toggle>
            )}
          </div>
        )}
        {!isWeekend && day.gym && (
          <p className="hint">
            {day.nap || hot || day.bedding
              ? `今天晚上 9 点去健身${hot ? `（今天 ${w?.max}°，太热了）` : ''}，这天不打游戏。`
              : '今天下午放学后去健身，3:00 左右到家。'}
          </p>
        )}
        {day.study === 'interview' && <p className="hint">面试准备代替了韩语、午睡和游戏。加油 💪</p>}
      </section>

      <Alerts store={store} today={today} weather={weather} setStore={update} />

      <Stuck />

      <main className="timeline">
        {low && <p className="lownote">低电量模式：只留下吃饭、洗澡、吃药、睡觉。做到这些，今天就算完成。</p>}
        {visible.map((sec, i) => (
          <section key={sec.id} className={`sec tone-${(i % 5) + 1}`}>
            <div className="sh">
              <h2>{sec.title}</h2>
              <span className="count">
                {sec.items.filter((i) => i.kind !== 'free' && day.done[i.id]).length} /{' '}
                {sec.items.filter((i) => i.kind !== 'free').length}
              </span>
            </div>
            <ul className="list">
              {sec.items.map((it) =>
                it.kind === 'free' ? (
                  <li key={it.id} className="free">
                    <span className="time">{it.time}</span>
                    <span>{it.text}</span>
                  </li>
                ) : (
                  <li key={it.id}>
                    <button
                      type="button"
                      className="item"
                      role="checkbox"
                      aria-checked={!!day.done[it.id]}
                      onClick={() => toggleItem(it)}
                    >
                      <span className="box">
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M3.5 8.5l3 3 6-7" />
                        </svg>
                      </span>
                      <span className="txt">
                        <span className="t">{low ? LOW_TEXT[it.id] ?? it.text : it.text}</span>
                        {it.sub && !low && <span className="sub">{it.sub}</span>}
                      </span>
                      <span className="time">{it.time}</span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </main>

      {!low && (
        <>
          <div className="tone-2"><Food store={store} today={today} update={update} /></div>
          <div className="tone-3"><WeekendPool store={store} today={today} update={update} markLast={markLast} /></div>
          <div className="tone-4"><Money store={store} today={today} update={update} /></div>
          <div className="tone-5"><Periodic store={store} today={today} update={update} /></div>
          <div className="tone-1"><ResidenceCard store={store} today={today} update={update} /></div>
          <div className="tone-2"><Settings store={store} update={update} /></div>
        </>
      )}
      <p className="foot">打勾都保存在这台手机的浏览器里。凌晨 4 点以前还算前一天。</p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return '早安呀';
  if (h < 18 && h >= 11) return '下午好';
  return '晚上好';
}
