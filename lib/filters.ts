import type { Row, VisaType } from "./destinations";

export type FilterState = {
  visaTypes: VisaType[];        // ["visa_free","evisa"]
  region?: string;              // "Any" or exact region
  excludes?: string[];          // ["Thailand","Maldives"]
  maxFlightHours?: number;      // undefined means no cap
  heldPrivileges?: string[];    // ["US_visa","Schengen_visa"]
};

export function applyFilters(rows: Row[], f: FilterState) {
  return rows.filter(d => {
    if (d.excluded) return false;

    if (f.excludes?.some(x => d.country.toLowerCase() === x.trim().toLowerCase())) return false;

    if (f.region && f.region !== "Any" && d.region !== f.region) return false;

    const vt: VisaType =
      d.visa_flags.visa_free ? "visa_free" :
      d.visa_flags.evisa ? "evisa" :
      d.visa_flags.visa_on_arrival ? "voa" : "visa_required";

    if (!f.visaTypes.includes(vt)) return false;

    if (typeof f.maxFlightHours === "number" && d.flightHoursFromDEL_est != null) {
      if (d.flightHoursFromDEL_est > f.maxFlightHours) return false;
    }

    if (f.heldPrivileges && f.heldPrivileges.length) {
      if (d.eligible_with.length > 0) {
        const ok = d.eligible_with.some(p => f.heldPrivileges!.includes(p));
        if (!ok) return false;
      }
    } else {
      if (d.eligible_with.length > 0) return false;
    }

    return true;
  });
}
