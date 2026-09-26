import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from './config';
import {
  addDays, daysBetween, DayState, dishDay, dowOf, getWeather, isRainy, isShowerDay, isSunny,
  Laundry, loadStore, logicalToday, mondayOf, periodicStatus, saveStore, seasonOf, Store, Study,
  Weather, weatherLabel, WEEKDAY, winterWeek, yen,
} from './lib';
import { buildDay, Item } from './schedule';
import { THEMES, themeCss } from './themes';

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

      <section className="card switches" aria-label="今天的情况">
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
        {visible.map((sec) => (
          <section key={sec.id} className="sec">
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
          <Food store={store} today={today} update={update} />
          <WeekendPool store={store} today={today} update={update} markLast={markLast} />
          <Money store={store} today={today} update={update} />
          <Periodic store={store} today={today} update={update} />
          <Card store={store} today={today} update={update} />
          <Settings store={store} update={update} />
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

// ---------------- 小组件 ----------------
function Toggle(props: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: 'low'; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`toggle ${props.tone ?? ''}`}
      aria-pressed={props.on}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

function Segment(props: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="seg-row">
      <span className="seg-label">{props.label}</span>
      <div className="seg" role="group" aria-label={props.label}>
        {props.options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={props.value === v} onClick={() => props.onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

type Upd = (fn: (s: Store) => void) => void;

// ---------------- 提醒 ----------------
function Alerts({ store, today, weather, setStore }: { store: Store; today: string; weather: Weather | null; setStore: Upd }) {
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

function DueList({ store, today, update }: { store: Store; today: string; update: Upd }) {
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

// ---------------- 我卡住了 ----------------
function Stuck() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(300);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);
  useEffect(() => {
    if (left === 0) setRunning(false);
  }, [left]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  if (!open)
    return (
      <button type="button" className="stuck-open" onClick={() => setOpen(true)}>
        我卡住了，开始不了
      </button>
    );
  return (
    <section className="stuck">
      <h2>卡住了也没关系</h2>
      <ol>
        <li>
          说出<b>下一步最小的动作</b>：不是「洗澡」，是「去把热水打开」。
        </li>
        <li>按下 5 分钟，只承诺做 5 分钟。</li>
        <li>时间到了可以停，停下也算赢。</li>
      </ol>
      <div className="timer">
        <span className="clock">{left === 0 ? '完成！' : `${mm}:${ss}`}</span>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (left === 0) setLeft(300);
            setRunning(!running);
          }}
        >
          {running ? '暂停' : left === 0 ? '再来 5 分钟' : left < 300 ? '继续' : '开始 5 分钟'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setLeft(300);
          }}
        >
          重置
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          收起
        </button>
      </div>
    </section>
  );
}

// ---------------- 吃饭存货 ----------------
function Food({ store, today, update }: { store: Store; today: string; update: Upd }) {
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

// ---------------- 周末家务 ----------------
function WeekendPool({
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

// ---------------- 钱 ----------------
function Money({ store, today, update }: { store: Store; today: string; update: Upd }) {
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

// ---------------- 定期事项 ----------------
function Periodic({ store, today, update }: { store: Store; today: string; update: Upd }) {
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

// ---------------- 在留卡 ----------------
function Card({ store, today, update }: { store: Store; today: string; update: Upd }) {
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

// ---------------- 设置 ----------------
function Settings({ store, update }: { store: Store; update: Upd }) {
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
