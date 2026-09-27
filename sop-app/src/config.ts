// 所有「关于我」的设定都在这里，改这个文件就能调整整个 SOP。

export const CONFIG = {
  location: { name: '池袋', lat: 35.7295, lon: 139.7109 },
  /** 最高气温低于这个值就按冬天算 */
  winterMaxTemp: 10,
  /** 最高气温超过这个值，健身改到晚上 */
  hotTemp: 27,
  /** 冬天洗澡「第一周」（周一、三、五、日）从这个周一开始算 */
  winterAnchorMonday: '2026-09-28',
  rent: 123000,
  waterFee: 4000,
  withdrawLimit: 200000,
  residenceExpiry: '2026-12-17',
};

export type PeriodicDef = {
  id: string;
  label: string;
  /** 距离上次多少天开始提醒 */
  remind: number;
  /** 距离上次多少天算到期（不填就等于 remind） */
  due?: number;
  /** 已知的上次日期 */
  seed?: string;
  doneLabel?: string;
  note?: string;
};

export const PERIODIC: PeriodicDef[] = [
  { id: 'meds', label: 'ADHD 药 + 安眠药', remind: 20, due: 28, seed: '2026-09-26', doneLabel: '今天开了药', note: '第 20 天开始预约，第 28 天吃完' },
  { id: 'vitamin', label: '维生素', remind: 27, due: 30, doneLabel: '开了新的一瓶', note: '一瓶 30 天' },
  { id: 'bathroom', label: '清洁浴室', remind: 14, due: 21 },
  { id: 'room', label: '整理房间', remind: 30 },
  { id: 'water', label: '买一箱水（28 瓶）', remind: 26, due: 30 },
  { id: 'washerTub', label: '洗衣机槽清洁', remind: 30 },
  { id: 'dryerFilter', label: '浴室干燥机滤网', remind: 30 },
  { id: 'sponge', label: '换洗碗海绵', remind: 30 },
  { id: 'acFilter', label: '空调滤网', remind: 14, due: 30, note: '开空调的季节才需要' },
  { id: 'toothbrush', label: '换牙刷', remind: 90 },
  { id: 'kitchenFilter', label: '厨房水龙头滤芯', remind: 90, seed: '2026-09-24' },
  { id: 'bathFilter', label: '浴室水龙头滤芯', remind: 90, due: 120, seed: '2026-08-15' },
  { id: 'sheets', label: '床单 + 被套（投币烘干）', remind: 14, note: '挑一个晚上去健身的工作日，前一天洗浴巾浴袍' },
  { id: 'quilt', label: '空调被', remind: 30, due: 45, note: '跟床品一起洗、一起烘干' },
];

export const CARD_STEPS: { id: string; text: string; by?: string }[] = [
  { id: 'school', text: '跟学校要「在学证明」和「出席、成绩证明」', by: '2026-10-10' },
  { id: 'form', text: '下载并填好在留期间更新许可申请书' },
  { id: 'photo', text: '拍证件照（4cm × 3cm）' },
  { id: 'money', text: '准备经费证明（汇款记录、存款证明等）' },
  { id: 'submit', text: '递交申请：品川入管，或网上申请', by: '2026-10-31' },
  { id: 'postcard', text: '收到明信片通知' },
  { id: 'pickup', text: '去领新的在留卡' },
];
