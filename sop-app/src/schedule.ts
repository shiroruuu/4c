import { CONFIG } from './config';
import {
  addDays, DayState, dowOf, isRainy, isShowerDay, isSunny, Store, Weather, weatherLabel,
} from './lib';

export type Item = {
  id: string;
  time: string;
  text: string;
  sub?: string;
  /** free = 自由时间，不用打勾 */
  kind?: 'task' | 'free';
  /** 低电量模式也保留 */
  core?: boolean;
  /** 打勾时的额外效果 */
  effect?: 'dinner';
};
export type Section = { id: string; title: string; items: Item[] };

export type Ctx = {
  store: Store;
  today: string;
  day: DayState;
  weather: Weather | null;
};

const t = (id: string, time: string, text: string, extra: Partial<Item> = {}): Item => ({ id, time, text, kind: 'task', ...extra });
const free = (id: string, time: string, text: string): Item => ({ id, time, text, kind: 'free' });

export function buildDay({ store, today, day, weather }: Ctx): Section[] {
  const dow = dowOf(today);
  const isWeekend = dow === 0 || dow === 6;
  const w = weather?.today;
  const sunny = isSunny(w);
  const rainy = isRainy(w);
  const hot = !!w && w.max > CONFIG.hotTemp;
  const prev = store.days[addDays(today, -1)];
  const prevFan = prev?.laundry === 'clothes' || prev?.laundry === 'towels';
  const laundry = day.laundry ?? null;
  const bedding = !!day.bedding && !isWeekend;
  const gym = !!day.gym && !isWeekend;
  const study = day.study ?? 'korean';
  const interview = study === 'interview';
  const nap = !!day.nap && !interview && !isWeekend;
  const eveningGym = gym && (nap || hot || bedding);
  const afternoonGym = gym && !eveningGym;
  const shower = isShowerDay(store, today, w) || gym;
  const isFri = dow === 5;
  const lateNight = dow === 5 || dow === 6; // 周五、周六 2 点睡
  const needBag = dow >= 0 && dow <= 4; // 第二天要上学：周日到周四

  const tomorrowW = weather?.tomorrow;
  const tomorrowText = tomorrowW ? `明天${weatherLabel(tomorrowW.code)}，${tomorrowW.min}–${tomorrowW.max}°` : '看一眼明天的天气';

  const dinnerText = day.takeout ? '点外卖，吃晚饭' : dow === 6 ? '吃晚饭（今天吃点别的）' : '热饭 + 吃晚饭';
  const dinnerSub = day.takeout || dow === 6 ? undefined : '冻饭解冻 2 分钟';
  const riceLow = store.food.riceLeft <= 1;
  const cookText = riceLow ? '做菜，顺便煮一锅饭（分 6 份，冻 5 份）' : '做菜';

  const studyText = (() => {
    if (study === 'class') return '📖 韩语课 + 准备或复习（一共 1.5 小时）';
    if (study === 'homework') return '📝 语校作业';
    if (study === 'interview') return '💼 准备面试';
    return nap ? '📖 自学韩语 1 小时' : '📖 自学韩语 1–1.5 小时';
  })();

  const laundryLoad = (time: string): Item | null => {
    if (bedding) return t('l-bed-load', time, `床品${day.quilt ? ' + 空调被' : ''}放进洗衣机，预约 20:50 洗好`, { sub: '床单、被套、枕套、靠枕套' });
    if (laundry === 'clothes') return t('l-load', time, '衣服放进洗衣机，预约 22:00 洗好', { sub: '毛巾也可以一起放' });
    if (laundry === 'towels') return t('l-load', time, '浴巾 + 浴袍 + 枕套 + 靠枕套放进洗衣机，预约 22:00 洗好');
    return null;
  };
  const laundryHang = (time: string): Item | null => {
    if (laundry === 'clothes') return t('l-hang', time, '⏰ 晾衣服：干燥 5 小时，风扇 6 小时', { sub: '对折或倒挂，袖子撑开' });
    if (laundry === 'towels') return t('l-hang', time, '⏰ 晾浴巾浴袍：干燥 6 小时，风扇 7 小时');
    return null;
  };

  const showerItems = (time: string): Item[] =>
    shower
      ? [
          t('e-watch', time, '⌚ 手表充电'),
          t('e-shower', time, '🛁 洗澡 + 洗头', { core: true }),
          t('e-after', time, '🪥 刷牙、护肤、穿浴袍、包头发'),
        ]
      : [t('e-teeth', time, '🪥 刷牙、护肤')];

  const bedtime = (): Item[] => [
    t('b-med', lateNight ? '01:30' : '22:30', '💊 吃药', { core: true }),
    t('b-clothes', lateNight ? '01:30' : '22:30', `👗 ${tomorrowText}，挑好衣服`),
    t('b-phone', lateNight ? '01:30' : '22:30', '📱 手机充电'),
    free('b-quiet', lateNight ? '01:35' : '22:35', '数独之类的安静小事'),
    t('b-sleep', lateNight ? '02:00' : '23:00', '😴 睡觉', { core: true }),
  ];

  const sections: Section[] = [];
  const nn = <T,>(xs: (T | null | false | undefined)[]) => xs.filter(Boolean) as T[];

  // ---------------- 周末 ----------------
  if (isWeekend) {
    sections.push({
      id: 'wk-day',
      title: '白天',
      items: nn<Item>([
        t('w-up', '12:00', '起床，拉开窗帘，喝水'),
        prevFan && t('w-fan', '12:00', '🌀 风扇拿出来充电，收衣服'),
        t('w-wash', '12:10', '洗漱 + 护肤'),
        t('w-meal1', '13:00', '第一顿饭 + 💊 维生素', { core: true, sub: '出去吃或者点外卖' }),
        free('w-free', '14:00', '自由时间：出门、休息、打游戏，顺手做一两件周末家务'),
        day.cook ? t('d-cook', '17:30', cookText, { sub: '湿垃圾顺手倒掉' }) : null,
        t('d-eat', '18:30', dinnerText, { core: true, sub: dinnerSub, effect: 'dinner' }),
        t('d-dish', '19:15', '🧽 洗碗 + 收拾厨房'),
        laundryLoad('19:40'),
      ]),
    });
    sections.push({
      id: 'wk-night',
      title: '晚上',
      items: nn<Item>([
        needBag && t('n-bag', '21:00', '🎒 整理书包'),
        ...showerItems('21:30'),
        laundryHang('22:00'),
        free('n-game', '22:00', lateNight ? '🎮 打游戏、放松，玩到 1:30' : '🎮 打游戏'),
        ...bedtime(),
      ]),
    });
    return sections;
  }

  // ---------------- 工作日 ----------------
  sections.push({
    id: 'morning',
    title: '早晨',
    items: nn<Item>([
      t('m-alarm', '07:30', '⏰ 闹钟响了，可以赖床到 7:45'),
      t('m-up', '07:45', '起床，拉开窗帘，喝几口水'),
      prevFan && t('m-fan', '07:46', '🌀 把风扇从浴室拿出来充电'),
      t('m-dress', '07:47', '👗 穿衣服'),
      t('m-air', '07:52', '早饭放进空气炸锅，定好时间'),
      t('m-wash', '07:54', '洗漱 + 脸部护肤'),
      sunny && t('m-sun', '08:04', '☀️ 身体涂防晒'),
      t('m-eat', '08:05', '吃早饭 + 💊 维生素', { core: true }),
      t('m-check', '08:15', '出门检查：手机、钥匙、卡、耳机、一瓶水'),
      (sunny || rainy) && t('m-umb', '08:17', rainy ? '☔ 带伞（今天可能下雨）' : '☀️ 带伞（遮阳）'),
      t('m-out', '08:18', '看一眼灯和窗，出门'),
    ]),
  });

  sections.push({
    id: 'noon',
    title: '中午',
    items: nn<Item>([
      t('l-lunch', '12:45', '🍱 吃午饭', { core: true }),
      afternoonGym && t('a-gym', '14:20', '🏋️ 去健身 30 分钟，走回家'),
    ]),
  });

  const home = afternoonGym ? '15:00' : '14:30';
  const afternoon: Item[] = [t('a-home', home, '到家，伞和钥匙挂在门上')];

  if (nap) {
    afternoon.push(t('a-nap', '14:30', '😴 午睡，闹钟定 6:00'));
    sections.push({ id: 'afternoon', title: '下午', items: afternoon });
    sections.push({
      id: 'evening',
      title: '晚上',
      items: nn<Item>([
        day.cook ? t('d-cook', '18:00', `起床，${cookText}`, { sub: '湿垃圾顺手倒掉' }) : free('a-wake', '18:00', '起床，缓一缓'),
        prevFan && t('a-collect', '18:00', '👕 收衣服'),
        t('d-eat', day.cook ? '19:00' : '18:30', dinnerText, { core: true, sub: dinnerSub, effect: 'dinner' }),
        t('d-dish', day.cook ? '19:30' : '19:20', '🧽 洗碗 + 收拾厨房'),
        laundryLoad('19:45'),
        t('s-study', '20:00', studyText),
        needBag && t('n-bag', '21:00', '🎒 整理书包'),
        ...(eveningGym
          ? nn<Item>([
              t('g-gym', '21:10', bedding ? '🏋️ 床品拿去投币烘干 → 健身 30 分钟 → 回来路上取' : '🏋️ 去健身 30 分钟'),
              ...showerItems('22:00'),
            ])
          : nn<Item>([
              ...showerItems('21:10'),
              free('n-free', '21:40', '自由时间'),
              laundryHang('22:00'),
              free('n-game', laundry ? '22:10' : '22:00', isFri ? '🎮 打游戏，玩到 1:30' : '🎮 打游戏'),
            ])),
      ]),
    });
    const bt = bedtime();
    if (eveningGym) {
      if (isFri) {
        bt.unshift(free('n-game', '22:40', '🎮 打游戏，玩到 1:30'));
        const hang = laundryHang('22:30');
        if (hang) bt.unshift(hang);
      } else {
        const hang = laundryHang('22:40');
        if (hang) bt.splice(1, 0, { ...hang, sub: '吃完药再晾' });
      }
    }
    sections.push({ id: 'bed', title: '睡前', items: bt });
    return sections;
  }

  // 不午睡
  if (prevFan) afternoon.push(t('a-collect', home, '👕 收衣服'));
  afternoon.push(
    t('s-study', afternoonGym ? '15:10' : '15:00', studyText),
    ...nn<Item>([needBag && t('n-bag', afternoonGym ? '16:40' : '16:30', '🎒 整理书包')]),
    free('a-free', afternoonGym ? '16:50' : '16:40', '自由时间'),
  );
  sections.push({ id: 'afternoon', title: '下午', items: afternoon });

  sections.push({
    id: 'evening',
    title: '晚上',
    items: nn<Item>([
      day.cook && t('d-cook', '17:45', cookText, { sub: '湿垃圾顺手倒掉' }),
      t('d-eat', day.cook ? '18:45' : '18:30', dinnerText, { core: true, sub: dinnerSub, effect: 'dinner' }),
      t('d-dish', day.cook ? '19:15' : '19:20', '🧽 洗碗 + 收拾厨房'),
      laundryLoad('19:40'),
      free('e-free', '19:45', '自由时间'),
      ...(eveningGym
        ? [
            t('g-gym', '21:00', bedding ? '🏋️ 床品拿去投币烘干 → 健身 30 分钟 → 回来路上取' : '🏋️ 去健身 30 分钟'),
            ...showerItems('21:50'),
          ]
        : nn<Item>([
            ...showerItems('21:30'),
            laundryHang('22:00'),
            !interview && free('n-game', laundry ? '22:10' : '22:00', isFri ? '🎮 打游戏，玩到 1:30' : '🎮 打游戏'),
          ])),
    ]),
  });

  const bt = bedtime();
  if (eveningGym) {
    if (isFri) bt.unshift(free('n-game', '22:30', '🎮 打游戏，玩到 1:30'));
    const hang = laundryHang('22:20');
    if (hang) bt.unshift(hang);
  }
  sections.push({ id: 'bed', title: '睡前', items: bt });
  return sections;
}
