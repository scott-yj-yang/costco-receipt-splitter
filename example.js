import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Tesseract from "tesseract.js";
import Decimal from "decimal.js-light";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Types ----------
// A profile is { name: string, avatar?: string }
// An item has: code, name, components:[{amount:number,taxable:boolean,kind:'base'|'discount'|'fee', code?, ref?, label?}],
//   share:{ mode:'equal'|'parts', selected:string[], parts:Record<string,number>, totalParts:number }, enrichment

// ---------- Helpers ----------
const DEFAULT_PROFILES = [
  { name: "Scott" },
  { name: "PB" },
  { name: "XY" },
  { name: "Boat" },
  { name: "XW" },
];

const FEE_KEYWORDS = /(REDEMP|CRV|RECYCL|BOTTLE|DEPOSIT)/i;

function parseReceiptText(raw) {
  const lines = raw
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  /** @type {any[]} */
  const items = [];
  let lastItem = null;
  let subtotalLine = null;
  let taxLine = null;
  let totalLine = null;

  for (const line of lines) {
    const u = line.toUpperCase();
    if (u.startsWith("SUBTOTAL")) {
      const m = line.match(/([0-9,.]+)\s*$/);
      if (m) subtotalLine = new Decimal(m[1].replace(/,/g, "")).toNumber();
      break;
    }

    // 1) Discount line, e.g. "357950 /1392843 4.20-" or "358215 #1581670 3.70-"
    const mDisc = line.match(/^\s*(?:E\s+)?(?<discCode>\d{3,})\s+(?<ref>[#\/]\w+)\s+(?<amt>[0-9,.]+)-\s*$/i);
    if (mDisc) {
      if (lastItem) {
        const amt = new Decimal(mDisc.groups.amt.replace(/,/g, ""));
        const delta = amt.neg();
        // discount inherits taxability of the product price component
        const baseTaxable = lastItem.components.find((c) => c.kind === 'base')?.taxable ?? lastItem.taxableDefault;
        lastItem.components.push({ amount: delta.toNumber(), taxable: baseTaxable, kind: 'discount', code: mDisc.groups.discCode, ref: mDisc.groups.ref.replace(/[#\/]/, ''), label: 'discount' });
      }
      continue;
    }

    // 2) Fee / surcharge line that references previous item and is taxable
    // Example: "5180 CA REDEMP VAL T EE/1669930 1.75"
    const mFee = line.match(/^\s*(?:E\s+)?(?<code>\d{3,})\s+(?<name>.+?)\s+(?<amt>[0-9,.]+)\s*$/);
    if (mFee && lastItem && (FEE_KEYWORDS.test(mFee.groups.name) || /[#\/]\w+/.test(mFee.groups.name))) {
      const amt = new Decimal(mFee.groups.amt.replace(/,/g, "")).toNumber();
      const refMatch = mFee.groups.name.match(/([#\/]\w+)/);
      const ref = refMatch ? refMatch[1].replace(/[#\/]/, '') : undefined;
      lastItem.components.push({ amount: amt, taxable: true, kind: 'fee', code: mFee.groups.code, ref, label: mFee.groups.name });
      continue;
    }

    // 3) Product line: optional leading E, code, name, price, tax flag Y/N
    const mProd = line.match(/^\s*(?:E\s+)?(?<code>\d{3,})\s+(?<name>.+?)\s+(?<price>[0-9,.]+)\s+(?<tax>[YN])\s*$/i);
    if (mProd) {
      const price = new Decimal(mProd.groups.price.replace(/,/g, "")).toNumber();
      const taxable = mProd.groups.tax.toUpperCase() === "Y";
      const item = {
        code: mProd.groups.code,
        name: mProd.groups.name.trim(),
        components: [ { amount: price, taxable, kind: 'base', code: mProd.groups.code, label: 'base' } ],
        taxableDefault: taxable,
        discounts: [], // kept for backward-compat UI
        fees: [],
        enrichment: null,
      };
      items.push(item);
      lastItem = item;
      continue;
    }
  }

  // Capture TAX and TOTAL from the tail if present
  for (const line of lines) {
    const u = line.toUpperCase();
    if (/^TAX\b/i.test(u)) {
      const m = line.match(/([0-9,.]+)\s*$/);
      if (m) taxLine = new Decimal(m[1].replace(/,/g, "")).toNumber();
    }
    if (/\*+\s*TOTAL/i.test(u)) {
      const m = line.match(/([0-9,.]+)\s*$/);
      if (m) totalLine = new Decimal(m[1].replace(/,/g, "")).toNumber();
    }
  }

  // Derive display lists
  for (const it of items) {
    it.discounts = it.components.filter((c) => c.kind === 'discount').map((c) => ({ amount: c.amount, ref: c.ref, code: c.code }));
    it.fees = it.components.filter((c) => c.kind === 'fee').map((c) => ({ amount: c.amount, ref: c.ref, code: c.code, label: c.label }));
  }

  return { items, subtotalLine, taxLine, totalLine };
}

function currencyNumber(x) { return new Decimal(x || 0).toDecimalPlaces(2).toNumber(); }

// Build normalized weights from item.share (equal or parts)
function weightsFromShare(item, profiles) {
  const share = item.share || { mode: "equal", selected: [], parts: {}, totalParts: 0 };
  const sel = share.selected && share.selected.length ? share.selected : [];
  if (sel.length === 0) return profiles.map(() => 0);
  if (share.mode === "parts") {
    const sumParts = sel.reduce((s, p) => s + Number(share.parts?.[p] || 0), 0);
    const denom = Math.max(1, Math.min(10, Number(share.totalParts || 0))) || sumParts || 1;
    const w = new Map(sel.map((p) => [p, (Number(share.parts?.[p] || 0)) / denom]));
    return profiles.map((p) => w.get(p) || 0);
  }
  const eq = 1 / sel.length;
  const w = new Map(sel.map((p) => [p, eq]));
  return profiles.map((p) => w.get(p) || 0);
}

// ---------- Main App ----------
export default function App() {
  const [profiles, setProfiles] = useState([...DEFAULT_PROFILES]);
  const [newProfile, setNewProfile] = useState("");
  const [taxRate, setTaxRate] = useState(7.75); // percent
  const [rawText, setRawText] = useState(`E\t1669930\tSPRITE ZERO\t19.89 Y\n5180\tCA REDEMP VAL T EE/1669930\t1.75\nE\t1581670\tH DAZ VAN\t13.99 N\n358215\t#1581670\t3.70-`);
  const [items, setItems] = useState([]);
  const [parsedTotals, setParsedTotals] = useState({ subtotalLine: null, taxLine: null, totalLine: null });
  const [busyOCR, setBusyOCR] = useState(false);
  const [flashMode, setFlashMode] = useState(false);
  const [flashIndex, setFlashIndex] = useState(0);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [focusedRow, setFocusedRow] = useState(0);
  const lastEditedShare = useRef(null);
  const selectingRef = useRef({ active: false, targetState: true });

  // Parse on demand
  useEffect(() => {
    const { items, subtotalLine, taxLine, totalLine } = parseReceiptText(rawText);
    const withUI = items.map((it) => ({
      ...it,
      share: { mode: "equal", selected: [], parts: {}, totalParts: 0 }, // default: no assignment
    }));
    setItems(withUI);
    setParsedTotals({ subtotalLine, taxLine, totalLine });
    setFlashIndex(0);
    setSelectedRows(new Set());
    setFocusedRow(0);
  }, [rawText]);

  function updateItem(i, patch) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    if (patch.share) lastEditedShare.current = patch.share;
  }

  // Apply last edited share to selected rows
  function applyToSelectedRows() {
    if (!lastEditedShare.current || selectedRows.size === 0) return;
    const share = lastEditedShare.current;
    setItems((prev) => prev.map((it, idx) => (selectedRows.has(idx) ? { ...it, share } : it)));
  }

  async function handleOCR(file) {
    if (!file) return;
    setBusyOCR(true);
    try {
      const { data } = await Tesseract.recognize(file, "eng", {
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz./ -#\n\t",
      });
      setRawText(data.text);
    } catch (e) {
      alert("OCR failed. Try a clearer photo or paste text.");
    } finally {
      setBusyOCR(false);
    }
  }

  // Calculations
  const calc = useMemo(() => {
    const rate = new Decimal(taxRate).div(100);
    const names = profiles.map((p) => p.name);

    const rows = items.map((it) => {
      const taxableBase = it.components.filter((c) => c.taxable).reduce((s, c) => new Decimal(s).add(c.amount), new Decimal(0));
      const nonTaxBase = it.components.filter((c) => !c.taxable).reduce((s, c) => new Decimal(s).add(c.amount), new Decimal(0));
      const base = taxableBase.add(nonTaxBase);
      const tax = taxableBase.mul(rate);
      const total = base.add(tax);

      const w = weightsFromShare(it, names);
      const allocations = w.map((a) => total.mul(a));
      const assigned = allocations.reduce((s, a) => s.add(a), new Decimal(0)).toNumber();

      return {
        ...it,
        taxableBase: taxableBase.toNumber(),
        nonTaxBase: nonTaxBase.toNumber(),
        base: base.toNumber(),
        tax: tax.toNumber(),
        total: total.toNumber(),
        weights: w,
        allocations: allocations.map((d) => d.toNumber()),
        assigned,
      };
    });

    const colTotals = profiles.map((_) => new Decimal(0));
    for (const r of rows) r.allocations.forEach((v, i) => (colTotals[i] = colTotals[i].add(v)));
    const grand = colTotals.reduce((a, b) => a.add(b), new Decimal(0));

    const computedSubtotal = items.reduce((s, it) => new Decimal(s).add(it.components.reduce((ss,c)=> new Decimal(ss).add(c.amount), new Decimal(0))), new Decimal(0));
    const computedTax = items.reduce((s, it) => new Decimal(s).add(it.components.filter(c=>c.taxable).reduce((ss,c)=> new Decimal(ss).add(c.amount), new Decimal(0)).mul(rate)), new Decimal(0));
    const computedTotal = computedSubtotal.add(computedTax);

    const assignmentProgress = computedTotal.toNumber() > 0 ? grand.div(computedTotal).toNumber() : 0;

    return {
      rows,
      colTotals: colTotals.map((d) => d.toNumber()),
      grand: grand.toNumber(),
      computed: {
        subtotal: computedSubtotal.toNumber(),
        tax: computedTax.toNumber(),
        total: computedTotal.toNumber(),
      },
      assignmentProgress,
      names,
    };
  }, [items, profiles, taxRate]);

  // Exports
  function exportMatrixCSV() {
    const headers = ["Item", ...calc.names, "Row Total"]; 
    const lines = [headers.join(",")];
    for (const r of calc.rows) {
      const row = [r.name, ...r.allocations.map((x) => currencyNumber(x)), currencyNumber(r.total)];
      lines.push(row.join(","));
    }
    const totalRow = ["TOTALS", ...calc.colTotals.map((x) => currencyNumber(x)), currencyNumber(calc.grand)];
    lines.push(totalRow.join(","));
    downloadFile(lines.join("\n"), "text/csv;charset=utf-8", "responsibility_matrix.csv");
  }

  function exportSessionJSON() {
    const session = {
      version: 2,
      taxRate,
      profiles,
      rawText,
      items: items.map((it) => ({
        code: it.code,
        name: it.name,
        components: it.components,
        share: it.share,
      })),
    };
    downloadFile(JSON.stringify(session, null, 2), "application/json", "costco_split_session.json");
  }

  function importSessionJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.items) || !Array.isArray(data.profiles)) throw new Error('Invalid session file');
        setTaxRate(Number(data.taxRate)||taxRate);
        setProfiles(data.profiles);
        setRawText(String(data.rawText||''));
        // Trust provided items as already parsed/cleaned
        setItems(data.items.map((it)=>({ ...it })));
      } catch (e) {
        alert('Failed to load session: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  function downloadFile(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
      const idx = focusedRow;
      if (idx < 0 || idx >= items.length) return;
      const current = items[idx];
      if (e.key === 'ArrowDown') { setFocusedRow((i) => Math.min(items.length-1, i+1)); return; }
      if (e.key === 'ArrowUp') { setFocusedRow((i) => Math.max(0, i-1)); return; }
      if (e.key === ' ') { // space toggles selection
        e.preventDefault();
        setSelectedRows((set) => { const s = new Set(set); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
        return;
      }
      if (e.key.toLowerCase() === 'e') { updateItem(idx, { share: { ...current.share, mode: 'equal' } }); return; }
      if (e.key.toLowerCase() === 'p') { updateItem(idx, { share: { ...current.share, mode: 'parts' } }); return; }
      if (e.key.toLowerCase() === 'a') { updateItem(idx, { share: { mode: 'equal', selected: profiles.map(p=>p.name), parts: {}, totalParts: profiles.length } }); return; }
      if (e.key.toLowerCase() === 'n') { updateItem(idx, { share: { mode: 'equal', selected: [], parts: {}, totalParts: 0 } }); return; }
      const num = Number(e.key);
      if (num>=1 && num<=9) {
        const name = profiles[num-1]?.name; if (!name) return;
        const set = new Set(current.share.selected||[]);
        set.has(name) ? set.delete(name) : set.add(name);
        updateItem(idx, { share: { ...current.share, selected: [...set] } });
        return;
      }
      if (e.key.toLowerCase() === 'x') { applyToSelectedRows(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, focusedRow, profiles, selectedRows]);

  // Selection drag behavior
  useEffect(() => {
    function endDrag(){ selectingRef.current.active=false; }
    window.addEventListener('mouseup', endDrag);
    return () => window.removeEventListener('mouseup', endDrag);
  }, []);

  // Helpers for profiles editing
  function addProfile() {
    const name = newProfile.trim();
    if (!name) return;
    if (profiles.some((p)=>p.name===name)) return alert("Profile already exists.");
    setProfiles((p) => [...p, { name }]);
    setNewProfile("");
  }
  function removeProfile(name) { setProfiles((p) => p.filter((x) => x.name !== name)); }
  function setAvatar(name, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfiles((p)=> p.map(pp=> pp.name===name? { ...pp, avatar: String(reader.result) } : pp));
    reader.readAsDataURL(file);
  }

  // Flashcard navigation helpers
  function nextCard() { setFlashIndex((i) => Math.min(items.length - 1, i + 1)); }
  function prevCard() { setFlashIndex((i) => Math.max(0, i - 1)); }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">Costco Receipt Splitter</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setFlashMode((v) => !v)} className="px-3 py-2 rounded-xl shadow bg-white hover:bg-gray-100">{flashMode ? 'Exit Flashcard' : 'Flashcard Mode'}</button>
            <button onClick={applyToSelectedRows} className="px-3 py-2 rounded-xl shadow bg-white hover:bg-gray-100" title="Apply last edited assignment to selected (shortcut: X)">Apply to selected</button>
            <button onClick={exportMatrixCSV} className="px-3 py-2 rounded-xl shadow bg-white hover:bg-gray-100">Export Matrix CSV</button>
            <button onClick={exportSessionJSON} className="px-3 py-2 rounded-xl shadow bg-white hover:bg-gray-100">Download Session (.json)</button>
            <label className="px-3 py-2 rounded-xl shadow bg-white hover:bg-gray-100 cursor-pointer">
              Load Session<input type="file" accept="application/json" className="hidden" onChange={(e)=>importSessionJSON(e.target.files?.[0])} />
            </label>
          </div>
        </header>

        {/* Assignment progress */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <div>Assignment progress</div>
            <div>{(calc.assignmentProgress * 100).toFixed(0)}%</div>
          </div>
          <div className="h-2 rounded bg-gray-200 overflow-hidden">
            <motion.div className="h-full bg-green-600" initial={{ width: 0 }} animate={{ width: `${calc.assignmentProgress * 100}%` }} />
          </div>
        </div>

        <section className="grid md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-white rounded-2xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold">1) Paste receipt text</h2>
            <textarea className="w-full h-56 p-3 border rounded-xl font-mono text-sm" value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste the receipt text here..." />
            <div className="text-sm text-gray-600">or upload a photo for OCR:</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white cursor-pointer w-fit">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOCR(e.target.files?.[0])} />
              {busyOCR ? "Reading..." : "Upload Image"}
            </label>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2">Tax rate (%)
                <input type="number" step="0.01" className="w-24 border rounded-lg p-1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              </label>
            </div>
            <div className="text-xs text-gray-500">Discounts and fees are merged into the item above; tax is applied only to taxable components.</div>
          </div>

          {/* Profiles */}
          <div className="bg-white rounded-2xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold">2) Profiles</h2>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <span key={p.name} className="inline-flex items-center gap-3 px-3 py-2 rounded-full bg-gray-100">
                  <span className="relative inline-block w-8 h-8 rounded-full overflow-hidden bg-gray-300">
                    {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover"/> : null}
                  </span>
                  <span className="font-medium">{p.name}</span>
                  <label className="text-xs px-2 py-1 border rounded cursor-pointer">Set photo
                    <input type="file" className="hidden" accept="image/*" onChange={(e)=>setAvatar(p.name, e.target.files?.[0])} />
                  </label>
                  <button className="text-gray-500 hover:text-red-600" onClick={() => removeProfile(p.name)} title="Remove">×</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input className="border rounded-lg p-2 flex-1" value={newProfile} onChange={(e) => setNewProfile(e.target.value)} placeholder="Add a profile name" />
              <button onClick={addProfile} className="px-3 py-2 rounded-xl shadow bg-gray-900 text-white">Add</button>
            </div>
          </div>
        </section>

        {/* Items Table */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">3) Assign items</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm select-none">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2 w-10">Sel</th>
                  <th className="p-2">Code</th>
                  <th className="p-2">Item</th>
                  <th className="p-2">Tax?</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Tax Amount</th>
                  <th className="p-2 text-right">Item price after tax</th>
                  <th className="p-2">Assignment</th>
                  <th className="p-2">Lookup</th>
                </tr>
              </thead>
              <tbody>
                {calc.rows.map((r, i) => {
                  const anyTaxable = r.taxableBase > 0;
                  return (
                  <tr key={i} className={`border-b last:border-0 align-top ${focusedRow===i?'bg-purple-50':''}`} onClick={()=>setFocusedRow(i)}>
                    <td className="p-2" onMouseDown={(e)=>{ e.preventDefault(); const isSel = selectedRows.has(i); selectingRef.current={ active:true, targetState: !isSel }; setSelectedRows((set)=>{ const s=new Set(set); !isSel? s.add(i): s.delete(i); return s; }); }} onMouseEnter={(e)=>{ if(selectingRef.current.active){ setSelectedRows((set)=>{ const s=new Set(set); selectingRef.current.targetState? s.add(i): s.delete(i); return s; }); } }}>
                      <button className={`w-6 h-6 rounded-md border ${selectedRows.has(i)?'bg-indigo-600 border-indigo-600':'bg-white'}`} aria-label="Select row" />
                    </td>
                    <td className="p-2 whitespace-nowrap">{r.code}</td>
                    <td className="p-2">
                      <div className="font-medium">{r.name}</div>
                      {/* Discounts */}
                      {r.discounts?.length ? (
                        <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                          {r.discounts.map((d, k) => (
                            <div key={k}>discount −${currencyNumber(-d.amount).toFixed(2)} {d.ref ? `(ref ${d.ref})` : ''}</div>
                          ))}
                        </div>
                      ) : null}
                      {/* Fees */}
                      {r.fees?.length ? (
                        <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                          {r.fees.map((f, k) => (
                            <div key={k}>fee +${currencyNumber(f.amount).toFixed(2)} {f.ref ? `(ref ${f.ref})` : ''}</div>
                          ))}
                        </div>
                      ) : null}
                      <div className="h-1.5 bg-gray-200 rounded mt-2 overflow-hidden">
                        <motion.div className="h-full bg-green-600" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (r.assigned / Math.max(0.0001, r.total)) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="p-2">{anyTaxable ? "Y" : "N"}</td>
                    <td className="p-2 text-right">{currencyNumber(r.base).toFixed(2)}</td>
                    <td className="p-2 text-right">{currencyNumber(r.tax).toFixed(2)}</td>
                    <td className="p-2 text-right font-semibold">{currencyNumber(r.total).toFixed(2)}</td>
                    <td className="p-2 w-[600px]">
                      <ShareEditor
                        item={items[i]}
                        rowTotal={r.total}
                        profiles={profiles}
                        onChange={(share) => updateItem(i, { share })}
                        quickAll={() => updateItem(i, { share: { mode: "equal", selected: profiles.map(p=>p.name), parts: {}, totalParts: profiles.length } })}
                      />
                    </td>
                    <td className="p-2">
                      <button className="px-2 py-1 border rounded-lg hover:bg-gray-50" onClick={() => handleEnrich(i)}>Search</button>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </section>

        {/* Responsibility Matrix */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">4) Responsibility matrix</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2 w-56">Item</th>
                  {calc.names.map((p) => (
                    <th key={p} className="p-2 text-right">{p}</th>
                  ))}
                  <th className="p-2 text-right">Row Σ</th>
                </tr>
              </thead>
              <tbody>
                {calc.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">{r.name}</td>
                    {r.allocations.map((a, j) => {
                      const ratio = r.total > 0 ? a / r.total : 0;
                      const alpha = a > 0 ? Math.min(0.7, 0.2 + ratio * 0.6) : 0;
                      const bg = a > 0 ? `rgba(221,160,221,${alpha})` : "transparent"; // plum tint
                      return (
                        <td key={j} className="p-2 text-right" style={{ backgroundColor: bg }}>{currencyNumber(a).toFixed(2)}</td>
                      );
                    })}
                    <td className="p-2 text-right font-semibold">{currencyNumber(r.total).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="p-2">Column Σ</td>
                  {calc.colTotals.map((t, i) => (
                    <td key={i} className="p-2 text-right">{currencyNumber(t).toFixed(2)}</td>
                  ))}
                  <td className="p-2 text-right">{currencyNumber(calc.grand).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Totals by person + inline bar chart */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">5) Totals by person</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {calc.names.map((p, i) => (
              <div key={p} className="rounded-xl border p-3">
                <div className="text-sm text-gray-600">{p}</div>
                <div className="text-xl font-bold">${currencyNumber(calc.colTotals[i]).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <TotalsBarChart labels={calc.names} values={calc.colTotals} />
          </div>
        </section>

        {/* Validation & Summary */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-4 space-y-2">
            <h2 className="text-lg font-semibold">6) Double-checks</h2>
            <ul className="text-sm list-disc ml-5 space-y-1">
              <li>Computed subtotal: <b>{currencyNumber(calc.computed.subtotal).toFixed(2)}</b> {parsedTotals.subtotalLine != null && (<span> (receipt {parsedTotals.subtotalLine.toFixed(2)})</span>)}</li>
              <li>Computed tax @ {taxRate}%: <b>{currencyNumber(calc.computed.tax).toFixed(2)}</b> {parsedTotals.taxLine != null && (<span> (receipt {parsedTotals.taxLine.toFixed(2)})</span>)}</li>
              <li>Computed total: <b>{currencyNumber(calc.computed.total).toFixed(2)}</b> {parsedTotals.totalLine != null && (<span> (receipt {parsedTotals.totalLine.toFixed(2)})</span>)}</li>
              <li>Allocations sum: <b>{currencyNumber(calc.grand).toFixed(2)}</b> (should equal computed total)</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 space-y-2">
            <h2 className="text-lg font-semibold">7) Pandas (optional)</h2>
            <div className="text-sm text-gray-600">Copy into a Python session to reproduce the matrix and plot totals (plum bars).</div>
            <textarea className="w-full h-40 p-2 border rounded-lg font-mono text-xs" value={pandasSnippet(calc)} readOnly />
          </div>
        </section>

        <footer className="text-center text-xs text-gray-500 py-10">
          Discounts and fees grouped automatically; equal shares or parts (sliders with validation). Flashcard mode, multi-row apply, drag selection. Shortcuts: ↑/↓ move, Space select, E equal, P parts, A all, N none, 1–9 toggle person, X apply.
        </footer>
      </div>

      {/* Floating action for Apply to selected */}
      {selectedRows.size>0 && (
        <div className="fixed bottom-4 right-4 bg-white border shadow-xl rounded-2xl p-3 flex items-center gap-3">
          <div className="text-sm">Selected: {selectedRows.size}</div>
          <button onClick={applyToSelectedRows} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Apply to selected</button>
        </div>
      )}

      {/* Flashcard overlay */}
      <AnimatePresence>
        {flashMode && items.length > 0 && (
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-6" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Item {flashIndex + 1} / {items.length}</div>
                <button onClick={() => setFlashMode(false)} className="px-2 py-1 rounded border">Close</button>
              </div>
              <div className="text-lg font-bold">{items[flashIndex].name}</div>
              <div className="text-sm text-gray-600 mb-2">Code {items[flashIndex].code}</div>
              <div className="mb-4 text-sm">Price: ${currencyNumber(calc.rows[flashIndex]?.base).toFixed(2)} · Tax: ${currencyNumber(calc.rows[flashIndex]?.tax).toFixed(2)} · After-tax: <b>${currencyNumber(calc.rows[flashIndex]?.total).toFixed(2)}</b></div>
              <ShareEditor
                item={items[flashIndex]}
                rowTotal={calc.rows[flashIndex]?.total || 0}
                profiles={profiles}
                onChange={(share) => updateItem(flashIndex, { share })}
                quickAll={() => updateItem(flashIndex, { share: { mode: "equal", selected: profiles.map(p=>p.name), parts: {}, totalParts: profiles.length } })}
              />
              <div className="flex items-center justify-between mt-4">
                <button className="px-3 py-2 rounded border" onClick={prevCard}>Prev</button>
                <div className="flex-1 mx-4 h-1.5 bg-gray-200 rounded overflow-hidden">
                  <motion.div className="h-full bg-green-600" initial={{ width: 0 }} animate={{ width: `${((flashIndex+1)/items.length)*100}%` }} />
                </div>
                <button className="px-3 py-2 rounded border" onClick={nextCard}>Next</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareEditor({ item, rowTotal, profiles, onChange, quickAll }) {
  const selected = item.share?.selected || [];
  const mode = item.share?.mode || "equal"; // "equal" | "parts"
  const parts = item.share?.parts || {};
  const totalParts = Math.max(1, Math.min(10, Number(item.share?.totalParts || 0)) || 0);

  function toggle(p) {
    const set = new Set(selected);
    if (set.has(p)) set.delete(p); else set.add(p);
    onChange({ ...item.share, selected: [...set] });
  }
  function setMode(m) { onChange({ ...item.share, mode: m }); }
  function setAll() { quickAll && quickAll(); }
  function setNone() { onChange({ mode: "equal", selected: [], parts: {}, totalParts: 0 }); }
  function setOnly(name) { onChange({ mode: "equal", selected: [name], parts: {}, totalParts: 0 }); }

  // Dynamic slider caps: person cannot exceed remaining capacity
  const sumOther = (person) => {
    return (selected.filter((p)=>p!==person)).reduce((s,p)=> s + Number(parts[p]||0), 0);
  };
  const denom = Math.max(1, Math.min(10, Number(totalParts||0)));
  const sumAll = selected.reduce((s,p)=> s + Number(parts[p]||0), 0);
  const remaining = Math.max(0, denom - sumAll);

  function setPart(person, value) {
    const v = Math.max(0, Math.min(denom - sumOther(person), Number(value)));
    onChange({ ...item.share, parts: { ...parts, [person]: v } });
  }
  function setDenom(n) {
    let d = Math.max(1, Math.min(10, Number(n)));
    // Clamp each person's parts to new denom
    const newParts = { ...parts };
    for (const p of selected) {
      const cap = d - (selected.filter((x)=>x!==p).reduce((s,x)=> s + Number(newParts[x]||0), 0));
      newParts[p] = Math.min(Number(newParts[p]||0), Math.max(0, cap));
    }
    onChange({ ...item.share, totalParts: d, parts: newParts });
  }
  function equalizeParts() {
    if (selected.length === 0) return;
    const next = {}; selected.forEach((p) => (next[p] = 1));
    onChange({ ...item.share, parts: next, totalParts: Math.min(10, Math.max(1, selected.length)) });
  }

  return (
    <div className="space-y-2">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-1 mb-1">
        <button className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200" onClick={setAll}>ALL</button>
        <button className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200" onClick={setNone}>None</button>
        {profiles.slice(0,6).map((p) => (
          <button key={p.name} className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200" onClick={() => setOnly(p.name)}>{p.name} only</button>
        ))}
      </div>

      {/* Profile toggles with avatars */}
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => (
          <button key={p.name} onClick={() => toggle(p.name)} className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${selected.includes(p.name) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-50"}`}>
            <span className="inline-block w-6 h-6 rounded-full overflow-hidden bg-gray-300">
              {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover"/> : null}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Mode segmented control */}
      <div className="flex items-center gap-3 text-xs mt-1">
        <div className="inline-flex rounded-xl border overflow-hidden">
          <button className={`px-3 py-1.5 ${mode==='equal'?'bg-indigo-600 text-white':'bg-white'}`} onClick={() => setMode('equal')}>Equal split</button>
          <button className={`px-3 py-1.5 ${mode==='parts'?'bg-indigo-600 text-white':'bg-white'}`} onClick={() => setMode('parts')}>Split by parts</button>
        </div>
        {mode === 'equal' && selected.length>0 && (<span className="text-gray-500">({(100/selected.length).toFixed(1)}% each)</span>)}
      </div>

      {/* Parts editor with strict 1..10 and editable input */}
      {mode === "parts" && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-3 text-xs">
            <span>Total parts (x):</span>
            <input type="range" min={1} max={10} step={1} value={denom} onChange={(e)=>setDenom(e.target.value)} />
            <input type="number" min={1} max={10} step={1} value={denom} onChange={(e)=>setDenom(e.target.value)} className="w-16 border rounded p-1" />
            <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={equalizeParts}>Equalize to 1 each</button>
            <span className="text-gray-500">Assigned: {selected.reduce((s,p)=> s + Number(parts[p]||0), 0)}/{denom}</span>
          </div>
          {selected.length === 0 && <div className="text-xs text-gray-500">Pick at least one profile.</div>}
          {selected.map((person) => {
            const cap = denom - sumOther(person); // maximum this person can take
            const current = Math.min(Number(parts[person]||0), Math.max(0, cap));
            return (
              <div key={person} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3 text-xs text-gray-700 truncate">{person}</div>
                <input type="range" min={0} max={Math.max(0, cap)} step={1} value={current} onChange={(e) => setPart(person, e.target.value)} className="col-span-7" />
                <div className="col-span-2 text-right text-xs">{current}/{denom} {denom > 0 && rowTotal > 0 ? ` ($${(current/denom*rowTotal).toFixed(2)})` : ''}</div>
              </div>
            );
          })}
          <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
            <motion.div className="h-full bg-green-600" initial={{ width: 0 }} animate={{ width: `${denom>0 ? Math.min(100,(selected.reduce((s,p)=> s + Number(parts[p]||0), 0)/denom)*100) : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function TotalsBarChart({ labels, values }) {
  const max = Math.max(1, ...values.map((v) => Number(v) || 0));
  const height = 160; const barW = 40; const gap = 24; const width = labels.length * (barW + gap) + gap;
  return (
    <svg width={width} height={height} role="img">
      {values.map((v, i) => { const h = (Number(v) / max) * (height - 40); const x = gap + i * (barW + gap); const y = height - h - 20; return (
        <g key={i}>
          <rect x={x} y={y} width={barW} height={h} fill="plum" />
          <text x={x + barW / 2} y={height - 5} textAnchor="middle" fontSize="10">{labels[i]}</text>
        </g>
      ); })}
    </svg>
  );
}

// Pandas snippet generator (kept plum accent)
function pandasSnippet(calc){
  const names = JSON.stringify(calc.names);
  const rows = calc.rows.map((r)=>({ item: r.name, ...Object.fromEntries(r.allocations.map((v,i)=> [calc.names[i], currencyNumber(v)])), row_total: currencyNumber(r.total) }));
  const json = JSON.stringify(rows, null, 2);
  return `import pandas as pd\nimport matplotlib.pyplot as plt\nrows = ${json}\ndf = pd.DataFrame(rows)\ndf.loc['TOTALS'] = ['TOTALS', ${calc.names.map((n)=>`df['${n}'].sum()`).join(', ')}, df['row_total'].sum()]\nprint(df)\ncols = ${names}\ntotals = df.loc['TOTALS', cols].astype(float)\nplt.figure()\nplt.bar(cols, totals, color='plum')\nplt.title('Totals by person')\nplt.ylabel('USD')\nplt.tight_layout()\nplt.show()`;
}

// Minimal enrich via DuckDuckGo (best-effort)
async function enrichCostcoItem(code, name) {
  const q = encodeURIComponent(`${code} ${name} site:costco.com`);
  try {
    const url = `https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1&no_html=1`;
    const res = await fetch(url); const data = await res.json();
    let productUrl = data?.AbstractURL || data?.Results?.[0]?.FirstURL || null;
    let imageUrl = data?.Image || null;
    return { productUrl, imageUrl };
  } catch (e) { return { productUrl: null, imageUrl: null }; }
}

// Mount when previewing in ChatGPT's canvas
if (typeof document !== "undefined") {
  const el = document.getElementById("root");
  if (el) createRoot(el).render(<App />);
}

export const meta = { preview: { head: `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    html { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
  </style>
  <script src="https://unpkg.com/tesseract.js@5.1.0/dist/tesseract.min.js"></script>
`, body: '<div id="root"></div>' } };

