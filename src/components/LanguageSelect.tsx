import React, { useState, useRef, useEffect, ReactNode } from 'react';

type Option<T> = { value: T; label: string; icon?: ReactNode };

export default function LanguageSelect<T>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((s) => !s)} className="inline-flex w-full items-center gap-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
        <span className="shrink-0 text-lg">{selected?.icon || '🔹'}</span>
        <span className="truncate">{selected?.label}</span>
        <span className="ml-auto text-xs text-slate-400">▾</span>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-2 w-full rounded-md border border-slate-800 bg-slate-900 shadow-lg">
          {options.map((opt) => (
            <li key={String(opt.value)}>
              <button type="button" onClick={() => { onChange(opt.value); setOpen(false); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">
                <span className="shrink-0 text-lg">{opt.icon || '🔹'}</span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{opt.label}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
