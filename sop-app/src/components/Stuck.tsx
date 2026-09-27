import React, { useEffect, useRef, useState } from 'react';
import { CARD_STEPS, CONFIG, PERIODIC } from '../config';
import {
  addDays, daysBetween, dishDay, dowOf, isRainy, isSunny, mondayOf, periodicStatus, seasonOf, Store, Weather, yen,
} from '../lib';
import { THEMES } from '../themes';
import { Segment, Toggle, Upd } from './ui';

export function Stuck() {
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
