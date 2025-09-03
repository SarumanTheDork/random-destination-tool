"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDestinations, type Row } from "@/lib/destinations";
import { applyFilters, type FilterState } from "@/lib/filters";

export default function RandomDestinationPage() {
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    visaTypes: ["visa_free", "evisa"],
    region: "Any",
    excludes: [],
    maxFlightHours: undefined,
    heldPrivileges: []
  });

  useEffect(() => {
    loadDestinations().then(setAll).finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => applyFilters(all, filters), [all, filters]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Random Destination Tool</h1>

      <div className="flex gap-3 items-center flex-wrap">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.visaTypes.includes("visa_free")}
            onChange={e =>
              setFilters(f => ({
                ...f,
                visaTypes: e.target.checked
                  ? Array.from(new Set([...f.visaTypes, "visa_free"]))
                  : f.visaTypes.filter(v => v !== "visa_free")
              }))
            }
          />
          Visa-free
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.visaTypes.includes("evisa")}
            onChange={e =>
              setFilters(f => ({
                ...f,
                visaTypes: e.target.checked
                  ? Array.from(new Set([...f.visaTypes, "evisa"]))
                  : f.visaTypes.filter(v => v !== "evisa")
              }))
            }
          />
          eVisa
        </label>
        <input
          placeholder="Max flight hours from DEL"
          className="border px-2 py-1 rounded"
          type="number"
          value={filters.maxFlightHours ?? ""}
          onChange={e =>
            setFilters(f => ({
              ...f,
              maxFlightHours: e.target.value === "" ? undefined : Number(e.target.value)
            }))
          }
        />
      </div>

      <div className="text-sm text-gray-500">
        Matching countries: {results.length}
      </div>

      <ul className="grid md:grid-cols-2 gap-3">
        {results.map(d => (
          <li key={d.country} className="border rounded p-3">
            <div className="font-medium">{d.country}</div>
            <div className="text-sm">{d.region} · {d.subregion}</div>
            <div className="text-sm mt-1">{d.notes}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
