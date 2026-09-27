import { CONFIG, PERIODIC, PeriodicDef } from './config';
import { DEFAULT_THEME } from './themes';

// ---------- 日期 ----------
const pad = (n: number) => String(n).padStart(2, '0');
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
export const dowOf = (k: string) => parseKey(k).getDay();
export const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 凌晨 4 点前还算前一天（周五周六 2 点才睡） */
export const logicalToday = (now = new Date()) => keyOf(new Date(now.getTime() - 4 * 3600 * 1000));

/** 这一周的周一 */
export const mondayOf = (k: string) => addDays(k, -((dowOf(k) + 6) % 7));

// ---------- 数据 ----------
export type Study = 'korean' | 'class' | 'homework' | 'interview';
export type Laundry = 'clothes' | 'towels' | null;

export type DayState = {
  done: Record<string, boolean>;
  nap?: boolean;
  study?: Study;
  gym?: boolean;
  cook?: boolean;
  takeout?: boolean;
  laundry?: Laundry;
  bedding?: boolean;
  quilt?: boolean;
  low?: boolean;
  riceCooked?: boolean;
  riceUsed?: boolean;
  prev?: Record<string, string | undefined>;
};

export type Store = {
  days: Record<string, DayState>;
  last: Record<string, string>;
  food: { dishOn?: string; riceLeft: number };
  drain: number;
  card: Record<string, boolean>;
  money: Record<string, { debit?: number; done: Record<string, boolean> }>;
  weekly: Record<string, Record<string, boolean>>;
  settings: { season: 'auto' | 'summer' | 'winter'; weekSwap: boolean; theme: string };
};

// 存储键名保留旧名字，改掉会丢失已有的打勾记录
const KEY = 'xiaorizi-sop-v1';

export function loadStore(): Store {
  const seedLast: Record<string, string> = {};
  for (const p of PERIODIC) if (p.seed) seedLast[p.id] = p.seed;
  const base: Store = {
    days: {},
    last: seedLast,
    food: { riceLeft: 0 },
    drain: 0,
    card: {},
    money: {},
    weekly: {},
    settings: { season: 'auto', weekSwap: false, theme: DEFAULT_THEME },
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    return { ...base, ...s, last: { ...seedLast, ...s.last }, settings: { ...base.settings, ...s.settings } };
  } catch {
    return base;
  }
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 存不了也不影响使用 */
  }
}

// ---------- 天气 ----------
export type DayWeather = { code: number; max: number; min: number; rain: number };
export type Weather = { fetched: string; today: DayWeather; tomorrow: DayWeather };

const WKEY = 'xiaorizi-weather';

export async function getWeather(today: string): Promise<Weather | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(WKEY) || 'null') as (Weather & { at: number }) | null;
    if (cached && cached.fetched === today && Date.now() - cached.at < 3 * 3600 * 1000) return cached;
  } catch {
    /* ignore */
  }
  const { lat, lon } = CONFIG.location;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&start_date=${today}&end_date=${addDays(today, 1)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const d = j.daily;
    const pick = (i: number): DayWeather => ({
      code: d.weather_code[i],
      max: Math.round(d.temperature_2m_max[i]),
      min: Math.round(d.temperature_2m_min[i]),
      rain: d.precipitation_probability_max[i] ?? 0,
    });
    const w: Weather = { fetched: today, today: pick(0), tomorrow: pick(1) };
    try {
      localStorage.setItem(WKEY, JSON.stringify({ ...w, at: Date.now() }));
    } catch {
      /* ignore */
    }
    return w;
  } catch {
    return null;
  }
}

export function weatherLabel(code: number) {
  if (code === 0) return '晴';
  if (code === 1) return '大致晴';
  if (code === 2) return '多云';
  if (code === 3) return '阴';
  if (code === 45 || code === 48) return '雾';
  if (code >= 51 && code <= 57) return '毛毛雨';
  if (code >= 61 && code <= 67) return '雨';
  if (code >= 71 && code <= 77) return '雪';
  if (code >= 80 && code <= 82) return '阵雨';
  if (code >= 85 && code <= 86) return '阵雪';
  if (code >= 95) return '雷雨';
  return '—';
}
export const isSunny = (w?: DayWeather) => !!w && w.code <= 1;
export const isRainy = (w?: DayWeather) => !!w && (w.code >= 51 || w.rain >= 50);

// ---------- 规则 ----------
export function seasonOf(store: Store, w?: DayWeather): 'summer' | 'winter' {
  if (store.settings.season !== 'auto') return store.settings.season;
  if (!w) return 'summer';
  return w.max < CONFIG.winterMaxTemp ? 'winter' : 'summer';
}

/** 冬天洗澡：第一周 一三五日，第二周 二四日 */
export function winterWeek(store: Store, day: string): 1 | 2 {
  const weeks = Math.floor(daysBetween(CONFIG.winterAnchorMonday, mondayOf(day)) / 7);
  const odd = ((weeks % 2) + 2) % 2 === 1;
  return (odd !== store.settings.weekSwap ? 2 : 1);
}

export function isShowerDay(store: Store, day: string, w?: DayWeather) {
  if (seasonOf(store, w) === 'summer') return true;
  const dow = dowOf(day);
  return winterWeek(store, day) === 1 ? [1, 3, 5, 0].includes(dow) : [2, 4, 0].includes(dow);
}

/** 菜吃到第几天了（点外卖、周六不算） */
export function dishDay(store: Store, today: string) {
  const from = store.food.dishOn;
  if (!from) return 0;
  let n = 0;
  for (let k = from; daysBetween(k, today) >= 0; k = addDays(k, 1)) {
    if (store.days[k]?.takeout) continue;
    if (dowOf(k) === 6) continue;
    n++;
  }
  return n;
}

export type PStatus = { state: 'unknown' | 'ok' | 'soon' | 'due'; since?: number; left?: number };
export function periodicStatus(p: PeriodicDef, last: string | undefined, today: string): PStatus {
  if (!last) return { state: 'unknown' };
  const since = daysBetween(last, today);
  const due = p.due ?? p.remind;
  if (since >= due) return { state: 'due', since };
  if (since >= p.remind) return { state: 'soon', since, left: due - since };
  return { state: 'ok', since, left: p.remind - since };
}

export const yen = (n: number) => n.toLocaleString('ja-JP') + ' 日元';
