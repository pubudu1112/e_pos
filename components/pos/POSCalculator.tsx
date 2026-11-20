"use client";

import { Calculator, X } from "lucide-react";

type Operator = "+" | "-" | "×" | "÷";

type POSCalculatorProps = {
  open: boolean;
  display: string;
  onClose: () => void;
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperator: (operator: Operator) => void;
  onEquals: () => void;
  onClear: () => void;
  onBackspace: () => void;
};

export default function POSCalculator({
  open,
  display,
  onClose,
  onDigit,
  onDecimal,
  onOperator,
  onEquals,
  onClear,
  onBackspace,
}: POSCalculatorProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/75">
      <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Calculator</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="m-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-right dark:bg-slate-950">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Result</p>
          <p className="overflow-hidden text-3xl font-black text-white">
            {Number(display).toLocaleString("en-LK", { maximumFractionDigits: 8 })}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 p-3 pt-0">
          <button type="button" onClick={onClear} className="rounded-xl bg-red-50 py-4 text-sm font-black text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/50">AC</button>
          <button type="button" onClick={onBackspace} className="rounded-xl bg-slate-100 py-4 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">DEL</button>
          <button type="button" onClick={() => onOperator("÷")} className="rounded-xl bg-emerald-50 py-4 text-lg font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50">÷</button>
          <button type="button" onClick={() => onOperator("×")} className="rounded-xl bg-emerald-50 py-4 text-lg font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50">×</button>

          {["7", "8", "9"].map((digit) => (
            <button key={digit} type="button" onClick={() => onDigit(digit)} className="rounded-xl bg-slate-50 py-4 text-lg font-bold text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">{digit}</button>
          ))}
          <button type="button" onClick={() => onOperator("-")} className="rounded-xl bg-emerald-50 py-4 text-lg font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50">−</button>

          {["4", "5", "6"].map((digit) => (
            <button key={digit} type="button" onClick={() => onDigit(digit)} className="rounded-xl bg-slate-50 py-4 text-lg font-bold text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">{digit}</button>
          ))}
          <button type="button" onClick={() => onOperator("+")} className="rounded-xl bg-emerald-50 py-4 text-lg font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50">+</button>

          {["1", "2", "3"].map((digit) => (
            <button key={digit} type="button" onClick={() => onDigit(digit)} className="rounded-xl bg-slate-50 py-4 text-lg font-bold text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">{digit}</button>
          ))}
          <button type="button" onClick={onEquals} className="row-span-2 rounded-xl bg-emerald-600 text-xl font-black text-white hover:bg-emerald-700">=</button>
          <button type="button" onClick={() => onDigit("0")} className="col-span-2 rounded-xl bg-slate-50 py-4 text-lg font-bold text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">0</button>
          <button type="button" onClick={onDecimal} className="rounded-xl bg-slate-50 py-4 text-lg font-bold text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">.</button>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 text-center dark:border-slate-800">
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Independent Calculator • POS</p>
        </div>
      </div>
    </div>
  );
}
