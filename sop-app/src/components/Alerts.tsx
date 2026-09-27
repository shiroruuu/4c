import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function Alerts({ store, today, weather, setStore }: { store: Store; today: string; weather: Weather | null; setStore: Upd }) {
  const list: { level: 'info' | 'warn' | 'urgent'; text: string }[] = [];
  const w = weather?.today;
  const dow = dowOf(today);

  if (isSunny(w) && dow >= 1 && dow <= 5) list.push({ level: 'info', text: '☀️ 今天晴天：身体涂防晒，带伞。' });
  if (isRainy(w)) list.push({ level: 'info', text: `☔ 今天可能下雨（${w?.rain}%），出门带伞。` });

  // 吃饭
  const dd = dishDay(store, today);
  if (store.food.dishOn && !store.days[today]?.cook) {
    if (dd >= 5) list.push({ level: 'urgent', text: `🥬 菜已经放了 ${dd} 天，今天做新的吧。` });
    else if (dd === 4) list.push({ level: 'warn', text: '🥬 菜到第 4 天了，今天最好吃掉，先别点外卖。今晚点外卖买菜，明天做新的。' });
    else if (dd === 3) list.push({ level: 'info', text: '🥬 菜还够今天和明天。明晚记得点外卖买菜。' });
  }
  if (store.food.riceLeft <= 1) list.push({ level: 'warn', text: `🍚 冻饭还剩 ${store.food.riceLeft} 份，下次做菜顺便煮一锅。` });

  // 洗衣服
  const season = seasonOf(store, w);
  const every = season === 'summer' ? 3 : 7;
  const lastClothes = store.last.clothes;
  if (!store.days[today]?.laundry) {
    if (!lastClothes) list.push({ level: 'info', text: '🧺 还没有洗衣服的记录。今天洗的话，在上面选「洗衣：衣服」。' });
    else if (daysBetween(lastClothes, today) >= every)
      list.push({ level: 'warn', text: `🧺 衣服 ${daysBetween(lastClothes, today)} 天没洗了。洗完碗顺手放进洗衣机，预约 22:00。` });
  }
  const sheets = periodicStatus(PERIODIC.find((p) => p.id === 'sheets')!, store.last.sheets, today);
  if ((sheets.state === 'soon' || sheets.state === 'due') && !store.days[today]?.bedding)
    list.push({ level: 'info', text: '🛏 这周该洗床品了：挑一个晚上去健身的工作日，前一天先洗浴巾浴袍。' });

  // 下水道
  if (store.drain >= 2) list.push({ level: 'warn', text: '🕳 下水道已经堵了 2 次，该刷一下了（在下面「定期」里点「刷好了」）。' });

  // 钱
  const dom = Number(today.slice(8, 10));
  if (dom >= 20 && dom <= 27) list.push({ level: 'warn', text: '💴 这几天要处理钱的事，看下面的「这个月的钱」。' });

  return (
    <section className="alerts" aria-label="要注意">
      {list.map((a, i) => (
        <p key={i} className={`alert ${a.level}`}>
          {a.text}
        </p>
      ))}
      <DueList store={store} today={today} update={setStore} />
    </section>
  );
}

export function DueList({ store, today, update }: { store: Store; today: string; update: Upd }) {
  const due = PERIODIC.filter((p) => p.id !== 'sheets')
    .map((p) => ({ p, st: periodicStatus(p, store.last[p.id], today) }))
    .filter(({ st }) => st.state === 'soon' || st.state === 'due');
  if (!due.length) return null;
  return (
    <>
      {due.map(({ p, st }) => (
        <div key={p.id} className={`alert ${st.state === 'due' ? 'urgent' : 'warn'} withbtn`}>
          <span>
            {p.id === 'meds'
              ? st.state === 'due'
                ? '💊 药应该吃完了，赶快去开药。'
                : `💊 该预约开药了（还剩 ${st.left} 天）。`
              : `⏰ ${p.label}：${st.state === 'due' ? '该做了' : `快到了，还有 ${st.left} 天`}`}
          </span>
          <button type="button" onClick={() => update((s) => void (s.last[p.id] = today))}>
            {p.doneLabel ?? '做好了'}
          </button>
        </div>
      ))}
    </>
  );
}
