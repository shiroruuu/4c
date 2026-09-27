import React from 'react';
import { Store } from '../lib';

export function Toggle(props: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: 'low'; disabled?: boolean }) {
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

export function Segment(props: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
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

export type Upd = (fn: (s: Store) => void) => void;
