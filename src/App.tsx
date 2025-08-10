
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Country, Privilege, VisaType } from "./types";
import demoData from "./data/demoDataset.json";
import "./styles.css";

type State = {
  visaTypes: Record<VisaType, boolean>;
  region: string;
  exclude: string;
  seed: string;
  maxHours: number | null;
  privileges: Record<Privilege, boolean>;
};

const ALL_VISA: VisaType[] = ["visa_free","evisa","voa","visa_required"];
const PRIV_LIST: Privilege[] = [
  "US_visa","UK_visa","Schengen_visa","Japan_visa","Australia_visa","Canada_visa","GCC_residence"
];

function getNowMonthIST(): number {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", month: "numeric" });
  return Number(fmt.format(now));
}

function seededIndex(len: number, seedString?: string): number {
  let h = 2166136261 >>> 0;
  const input = seedString || "" + Date.now();
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  h >>>= 0;
  return h % Math.max(1, len);
}

function weightedPick<T>(items: T[], weights: number[], seedString?: string): T | null {
  if (items.length === 0) return null;
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return items[seededIndex(items.length, seedString)];
  const cum: number[] = [];
  let s = 0;
  for (const w of weights) { s += Math.max(0, w); cum.push(s); }
  let h = 2166136261 >>> 0;
  const input = seedString || "" + Date.now();
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  h >>>= 0;
  const r = (h / 0xffffffff) * total;
  const idx = cum.findIndex(x => r <= x);
  return items[idx < 0 ? items.length - 1 : idx];
}

function effectiveVisaType(c: Country, privileges: Record<Privilege, boolean>): { visaType: VisaType, notes?: string } {
  if (c.conditional) {
    for (const rule of c.conditional) {
      const any = rule.requiresAnyPrivileges || [];
      const all = rule.requiresAllPrivileges || [];
      const anyOk = any.length === 0 || any.some(p => privileges[p]);
      const allOk = all.every(p => privileges[p]);
      if (anyOk && allOk) {
        return { visaType: rule.visaType, notes: rule.notes };
      }
    }
  }
  if (c.base) return { visaType: c.base.visaType, notes: c.base.notes };
  return { visaType: "visa_required" };
}

export default function App() {
  const [data, setData] = useState<Country[]>(() => {
    try {
      const fromLS = localStorage.getItem("rdt_dataset_v2");
      if (fromLS) return JSON.parse(fromLS);
    } catch {}
    return demoData as Country[];
  });

  const [state, setState] = useState<State>(() => {
    try {
      const s = localStorage.getItem("rdt_state_v2");
      if (s) return JSON.parse(s);
    } catch {}
    const privInit: Record<Privilege, boolean> = Object.fromEntries(PRIV_LIST.map(p => [p, false])) as any;
    return {
      visaTypes: { visa_free: true, evisa: true, voa: true, visa_required: false },
      region: "Any",
      exclude: "",
      seed: "",
      maxHours: null,
      privileges: privInit
    };
  });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const monthIST = getNowMonthIST();

  useEffect(() => {
    try { localStorage.setItem("rdt_state_v2", JSON.stringify(state)); } catch {}
  }, [state]);
  useEffect(() => {
    try { localStorage.setItem("rdt_dataset_v2", JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const seed = p.get("seed") || "";
    const region = p.get("region") || "Any";
    const exclude = p.get("exclude") || "";
    const maxh = p.get("maxh");
    const vt = p.get("vt");
    const priv = p.get("priv");
    setState(prev => ({
      ...prev,
      seed,
      region,
      exclude,
      maxHours: maxh === null ? prev.maxHours : (maxh === "" ? null : Number(maxh)),
      visaTypes: vt ? (Object.fromEntries(ALL_VISA.map(v => [v, vt.split(",").includes(v)])) as any) : prev.visaTypes,
      privileges: priv ? (Object.fromEntries(PRIV_LIST.map(pv => [pv, priv.split(",").includes(pv)])) as any) : prev.privileges
    }));
    const pick = p.get("pick");
    if (pick) {
      const found = (data as Country[]).find(c => c.name.toLowerCase() === decodeURIComponent(pick).toLowerCase());
      if (found) setResult(found);
    }
  }, []);

  function updateURL(pick?: Country) {
    const p = new URLSearchParams();
    if (state.seed) p.set("seed", state.seed);
    if (state.region !== "Any") p.set("region", state.region);
    const vt = ALL_VISA.filter(v => state.visaTypes[v]).join(",");
    if (vt !== "visa_free,evisa,voa") p.set("vt", vt);
    if (state.exclude) p.set("exclude", state.exclude);
    if (state.maxHours != null) p.set("maxh", String(state.maxHours));
    const priv = PRIV_LIST.filter(pr => state.privileges[pr]).join(",");
    if (priv) p.set("priv", priv);
    if (pick) p.set("pick", encodeURIComponent(pick.name));
    const qs = p.toString();
    const url = qs ? `?${qs}` : "";
    window.history.replaceState({}, "", url);
    return window.location.href;
  }

  const normalizedExclude = useMemo(() =>
    state.exclude.split(",").map(s => s.trim().toLowerCase()).filter(Boolean), [state.exclude]);

  const regions = useMemo(() => ["Any", ...Array.from(new Set(data.map(c => c.region)))], [data]);

  function monthsWeight(c: Country): number {
    if (!Array.isArray(c.bestMonths) || c.bestMonths.length === 0) return 1;
    return c.bestMonths.includes(monthIST) ? 3 : 1;
  }

  function countryPasses(c: Country): { ok: boolean, effective: { visaType: VisaType, notes?: string } } {
    const eff = effectiveVisaType(c, state.privileges);
    if (!state.visaTypes[eff.visaType]) return { ok: false, effective: eff };
    if (state.region !== "Any" && c.region !== state.region) return { ok: false, effective: eff };
    if (normalizedExclude.includes(c.name.toLowerCase())) return { ok: false, effective: eff };
    if (state.maxHours != null && typeof c.flightHoursFromDEL === "number" && c.flightHoursFromDEL > state.maxHours)
      return { ok: false, effective: eff };
    return { ok: true, effective: eff };
  }

  const pool = useMemo(() => {
    const items: { c: Country, eff: { visaType: VisaType, notes?: string } }[] = [];
    for (const c of data) {
      const res = countryPasses(c);
      if (res.ok) items.push({ c, eff: res.effective });
    }
    return items;
  }, [data, state, normalizedExclude]);

  const [result, setResult] = useState<Country | null>(null);

  function spin() {
    const items = pool.map(p => p.c);
    const weights = items.map(c => monthsWeight(c));
    const pick = weightedPick(items, weights, state.seed);
    setResult(pick);
    if (pick) updateURL(pick);
  }

  function copyResult() {
    if (!result) return;
    const eff = effectiveVisaType(result, state.privileges);
    const text = `${result.flag || ""} ${result.name} • ${result.region} • ${String(eff.visaType).toUpperCase()}${
      typeof result.flightHoursFromDEL === "number" ? " • ~" + result.flightHoursFromDEL + "h from DEL" : ""
    }\n${eff.notes || ""}`.trim();
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function copyLink() {
    const url = updateURL(result || undefined);
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function togglePrivilege(pv: Privilege) {
    setState(s => ({ ...s, privileges: { ...s.privileges, [pv]: !s.privileges[pv] }}));
  }
  function toggleVisaType(v: VisaType) {
    setState(s => ({ ...s, visaTypes: { ...s.visaTypes, [v]: !s.visaTypes[v] }}));
  }

  function onImportClick() { fileRef.current?.click(); }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (Array.isArray(json)) setData(json);
      } catch {}
    };
    reader.readAsText(f);
    e.target.value = "";
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "random-destination-dataset.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Random Destination Tool</h1>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-900 border">
              Dataset and rules are [Unverified]. Verify with official sources before booking.
            </span>
            <button onClick={onImportClick} className="px-3 py-1 border rounded-full">Import JSON</button>
            <button onClick={exportJSON} className="px-3 py-1 border rounded-full">Export JSON</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFileChange} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-1 bg-white border rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Visa types</label>
              <div className="flex flex-wrap gap-2">
                {ALL_VISA.map(v => (
                  <button key={v} onClick={() => toggleVisaType(v)}
                    className={`px-3 py-1 rounded-full border text-sm ${state.visaTypes[v] ? "bg-slate-900 text-white" : "bg-white"}`}>
                    {v === "visa_free" ? "Visa-free" : v === "evisa" ? "eVisa" : v === "voa" ? "Visa on arrival" : "Visa required"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Region</label>
              <select className="w-full border rounded-lg px-3 py-2" value={state.region}
                      onChange={e => setState(s => ({ ...s, region: e.target.value }))}>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text sm font-medium mb-1">Exclude countries (comma separated)</label>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Thailand, Maldives"
                     value={state.exclude}
                     onChange={e => setState(s => ({ ...s, exclude: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max flight time from DEL (hours)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" placeholder="Leave empty for no cap"
                     value={state.maxHours ?? ""}
                     onChange={e => setState(s => ({ ...s, maxHours: e.target.value === "" ? null : Number(e.target.value) }))}
                     min={0} step={0.5} />
              <p className="mt-1 text-xs text-slate-500">Uses the optional flightHoursFromDEL field if present.</p>
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">Held visas or privileges</label>
<div className="flex flex-wrap gap-2">
  {PRIV_LIST.map((pv) => (
    <button
      key={pv}
      onClick={() => togglePrivilege(pv)}
      className={`px-3 py-1 rounded-full border text-sm ${
        state.privileges[pv] ? "bg-indigo-600 text-white" : "bg-white"
      }`}
    >
      {pv.replace("_", " ")}
    </button>
  ))}
</div>
              <p className="mt-1 text-xs text-slate-500">
                These flags filter destinations that become easier with certain third-country visas. All logic is [Unverified].
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Seed (optional, for reproducible spins)</label>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Any text"
                     value={state.seed}
                     onChange={e => setState(s => ({ ...s, seed: e.target.value }))} />
            </div>

            <button onClick={spin}
                    className="w-full mt-2 bg-indigo-600 text-white rounded-xl px-4 py-3 font-semibold shadow-sm hover:opacity-95">
              Spin a destination
            </button>
          </div>
        </section>

        <section className="md:col-span-2 grid gap-4">
          <div className="bg-white border rounded-2xl p-6 shadow-sm min-h-[180px] flex items-center justify-center">
            {result ? (
              <div className="w-full">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-5xl leading-none">{result.flag || "🌍"}</div>
                    <h3 className="text-2xl font-bold mt-2">{result.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {result.region} • {
                        (() => {
                          const eff = effectiveVisaType(result, state.privileges);
                          return String(eff.visaType).toUpperCase();
                        })()
                      } {typeof result.flightHoursFromDEL === "number" ? `• ~${result.flightHoursFromDEL}h from DEL` : ""}
                    </p>
                    {(() => {
                      const eff = effectiveVisaType(result, state.privileges);
                      return eff.notes ? <p className="mt-2 text-slate-800">{eff.notes}</p> : null;
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyResult} className="px-3 py-2 border rounded-lg">Copy</button>
                    <button onClick={copyLink} className="px-3 py-2 border rounded-lg">Copy link</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="border rounded-xl p-3">
                    <div className="text-xs text-slate-500">Next step</div>
                    <div className="text-sm">Verify entry rules on official immigration or airline advisories before booking.</div>
                  </div>
                  <div className="border rounded-xl p-3">
                    <div className="text-xs text-slate-500">What to check</div>
                    <ul className="text-sm list-disc ml-4">
                      <li>Passport validity and blank pages</li>
                      <li>Return ticket and hotel proof</li>
                      <li>Funds and travel insurance</li>
                    </ul>
                  </div>
                  <div className="border rounded-xl p-3">
                    <div className="text-xs text-slate-500">Tip</div>
                    <div className="text-sm">Seasonality is weighted. Best months get a higher chance when spinning.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl">🎯</div>
                <p className="mt-2 text-slate-700">Use the filters and press Spin.</p>
              </div>
            )}
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Matching countries</h4>
              <div className="text-sm text-slate-600">{pool.length} of {data.length}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pool.map(p => (
                <span key={p.c.name} className="px-3 py-1 border rounded-full text-sm bg-slate-50">
                  {(p.c.flag || "🌍")} {p.c.name}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <h4 className="font-semibold mb-2">Dataset schema</h4>
            <pre className="text-xs overflow-auto bg-slate-50 p-3 rounded-xl border">{JSON.stringify({
              name: "Country Name",
              iso2: "CC",
              region: "Region",
              flag: "🇨🇨",
              base: { visaType: "visa_free | evisa | voa | visa_required", notes: "Optional" },
              conditional: [{
                visaType: "visa_free | evisa | voa | visa_required",
                notes: "Optional",
                requiresAnyPrivileges: ["US_visa","UK_visa"],
                requiresAllPrivileges: ["Schengen_visa"]
              }],
              flightHoursFromDEL: 0,
              bestMonths: [1,2,3]
            }, null, 2)}</pre>
            <p className="text-xs text-slate-500 mt-2">
              Import a JSON array of Country objects to replace the in-app dataset. Rules are evaluated against your selected privileges.
            </p>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-slate-500">
        Built with Vite + React + Tailwind. All visa logic is [Unverified]. Replace with a maintained source before launch.
      </footer>
    </div>
  );
}
