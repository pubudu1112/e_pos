"use client";

import { useEffect, useRef, useState } from "react";
import { X, ShoppingCart } from "lucide-react";

type Service = { id: number; name: string; code: string; type: "PRODUCT" | "SERVICE" };
export type PDFCounterCartEntry = { serviceId: number; quantity: number };
type Props = {
  services: Service[];
  onClose: () => void;
  onAddToCart: (entries: PDFCounterCartEntry[]) => void;
};
const STORAGE_KEY = "pubudu-pos-pdf-counter-services-v1";

export default function PDFCounterModal({ services, onClose, onAddToCart }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [doubleServiceId, setDoubleServiceId] = useState("");
  const [singleServiceId, setSingleServiceId] = useState("");
  const [counts, setCounts] = useState({ doubleSideCount: 0, singleSideCount: 0, fileCount: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setDoubleServiceId(String(saved.doubleServiceId || ""));
      setSingleServiceId(String(saved.singleServiceId || ""));
    } catch { /* ignore invalid old settings */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ doubleServiceId, singleServiceId }));
  }, [ready, doubleServiceId, singleServiceId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (data?.source !== "pubudu-pdf-counter" || data.type !== "COUNTS_CHANGED") return;
      const values = [data.doubleSideCount, data.singleSideCount, data.fileCount];
      if (values.some(v => !Number.isSafeInteger(v) || v < 0)) return;
      setCounts({ doubleSideCount: values[0], singleSideCount: values[1], fileCount: values[2] });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const availableServices = services.filter(s => s.type === "SERVICE");
  const doubleValid = availableServices.some(s => String(s.id) === doubleServiceId);
  const singleValid = availableServices.some(s => String(s.id) === singleServiceId);
  const canAdd = counts.fileCount > 0 && (counts.doubleSideCount + counts.singleSideCount) > 0 &&
    (counts.doubleSideCount === 0 || doubleValid) && (counts.singleSideCount === 0 || singleValid) &&
    !(doubleServiceId && singleServiceId && doubleServiceId === singleServiceId);

  function addToCart() {
    if (!canAdd) return;
    const entries: PDFCounterCartEntry[] = [];
    if (counts.doubleSideCount > 0) entries.push({ serviceId: Number(doubleServiceId), quantity: counts.doubleSideCount });
    if (counts.singleSideCount > 0) entries.push({ serviceId: Number(singleServiceId), quantity: counts.singleSideCount });
    onAddToCart(entries);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="PDF Counter">
      <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col overflow-hidden rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-3">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-foreground">PDF Counter</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted transition" aria-label="Close PDF Counter"><X size={20} /></button>
        </div>
        <iframe ref={iframeRef} src="/pdf-counter.html" title="Original PDF Counter" className="min-h-0 w-full flex-1 border-0" onLoad={() => iframeRef.current?.contentWindow?.postMessage({ source: "pubudu-pos", type: "REQUEST_COUNTS" }, window.location.origin)} />
        <div className="border-t border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Double Side POS Service
              <select className="mt-1 w-full rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-2 text-slate-900 dark:text-foreground outline-none" value={doubleServiceId} onChange={e => setDoubleServiceId(e.target.value)}>
                <option value="">Select Double Side service</option>
                {availableServices.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">One Side POS Service
              <select className="mt-1 w-full rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-2 text-slate-900 dark:text-foreground outline-none" value={singleServiceId} onChange={e => setSingleServiceId(e.target.value)}>
                <option value="">Select One Side service</option>
                {availableServices.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </label>
          </div>
          {doubleServiceId && doubleServiceId === singleServiceId && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Choose two different POS services.</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-5 text-sm font-bold text-slate-800 dark:text-foreground"><span>Double Side: {counts.doubleSideCount}</span><span>One Side: {counts.singleSideCount}</span></div>
            <button type="button" disabled={!canAdd} onClick={addToCart} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 shadow-md transition disabled:cursor-not-allowed disabled:opacity-40"><ShoppingCart size={18}/> Add to POS Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
}
