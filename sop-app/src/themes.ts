// 9 套配色（Chabai COLOR SCHEME NO.10–18）
// swatches 是原图的 5 个颜色；其余是从里面挑出来、保证文字看得清的角色色。

export type Theme = {
  id: string;
  name: string;
  swatches: string[];
  bg: string;
  soft: string;
  accent: string;
  ink: string;
  /** 深色模式下的强调色 */
  accentDark: string;
};

export const THEMES: Theme[] = [
  { id: '10', name: '薰衣草奶霜', swatches: ['#DFD0E7', '#FAECEC', '#EFD9DC', '#CBD8E8', '#EBF2FC'], bg: '#F7F2F9', soft: '#DFD0E7', accent: '#8A74A6', ink: '#3A3346', accentDark: '#DFD0E7' },
  { id: '11', name: '雾蓝紫', swatches: ['#69779C', '#9893B1', '#B7B1D5', '#ABDBDF', '#D9E9E9'], bg: '#EEF4F5', soft: '#B7B1D5', accent: '#69779C', ink: '#2C3247', accentDark: '#ABDBDF' },
  { id: '12', name: '冷灰薄荷', swatches: ['#F5F3F4', '#E0E0E0', '#BFDAD5', '#B3BFD7', '#A8B2BB'], bg: '#F5F3F4', soft: '#BFDAD5', accent: '#6E80A8', ink: '#30383F', accentDark: '#BFDAD5' },
  { id: '13', name: '糖果汽水', swatches: ['#AAF0E8', '#F5F0D2', '#F9A0BC', '#9385A8', '#605870'], bg: '#FBF8EC', soft: '#AAF0E8', accent: '#8A7AA3', ink: '#3B354A', accentDark: '#F9A0BC' },
  { id: '14', name: '桃子紫藤', swatches: ['#FEDDD4', '#FDC7D7', '#D390BB', '#957DAD', '#83A7C1'], bg: '#FFF5F2', soft: '#FDC7D7', accent: '#957DAD', ink: '#3D3346', accentDark: '#FDC7D7' },
  { id: '15', name: '抹茶', swatches: ['#F1EFE0', '#AACABD', '#A8D7C5', '#73B697', '#5B8C89'], bg: '#F4F3EA', soft: '#A8D7C5', accent: '#5B8C89', ink: '#273B38', accentDark: '#A8D7C5' },
  { id: '16', name: '莓果可可', swatches: ['#F2D4D4', '#DCB6C5', '#AE8CAD', '#4A4D82', '#7D4D3F'], bg: '#FBF0F0', soft: '#DCB6C5', accent: '#4A4D82', ink: '#2E2A40', accentDark: '#DCB6C5' },
  { id: '17', name: '珊瑚深海', swatches: ['#316074', '#F0D1B5', '#F1B5AA', '#F08C8E', '#E9D6CF'], bg: '#FBF4EF', soft: '#F0D1B5', accent: '#316074', ink: '#22343C', accentDark: '#F1B5AA' },
  { id: '18', name: '夏日荧光', swatches: ['#FEA8E5', '#78D4ED', '#99EEE7', '#EAE7D8', '#70C7D0'], bg: '#F8F7F1', soft: '#99EEE7', accent: '#2E9AA6', ink: '#25383B', accentDark: '#FEA8E5' },
];

export const DEFAULT_THEME = '15';

export function themeCss(id: string) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const darkBg = `color-mix(in srgb, ${t.ink} 45%, #0c0c10)`;
  const sw = t.swatches.map((c, i) => `--c${i + 1}:${c};`).join('');
  return `
:root{
  ${sw}
  --bg:${t.bg};
  --surface:color-mix(in srgb, #ffffff 72%, ${t.bg});
  --surface-2:color-mix(in srgb, ${t.soft} 38%, ${t.bg});
  --ink:${t.ink};
  --muted:color-mix(in srgb, ${t.ink} 64%, ${t.bg});
  --line:color-mix(in srgb, ${t.ink} 14%, ${t.bg});
  --accent:${t.accent};
  --accent-soft:color-mix(in srgb, ${t.soft} 55%, ${t.bg});
  --on-accent:#ffffff;
}
@media (prefers-color-scheme: dark){
  :root{
    --bg:${darkBg};
    --surface:color-mix(in srgb, ${t.ink} 60%, #1a1a20);
    --surface-2:color-mix(in srgb, ${t.ink} 70%, #2a2a33);
    --ink:color-mix(in srgb, ${t.bg} 90%, #ffffff);
    --muted:color-mix(in srgb, ${t.bg} 62%, ${t.ink});
    --line:color-mix(in srgb, ${t.bg} 16%, ${darkBg});
    --accent:${t.accentDark};
    --accent-soft:color-mix(in srgb, ${t.accentDark} 24%, ${darkBg});
    --on-accent:${t.ink};
  }
}`;
}
