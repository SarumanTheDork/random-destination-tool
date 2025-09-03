export type VisaType = "visa_free" | "evisa" | "voa" | "visa_required";

export type Row = {
  country: string;
  region: string;
  subregion: string;
  visa_flags: { visa_free: boolean; evisa: boolean; visa_on_arrival: boolean; visa_required: boolean };
  max_stay_days: number | null;
  flightHoursFromDEL_est: number | null;
  eligible_with: string[];
  excluded: boolean;
  notes: string;
};

export async function loadDestinations(): Promise<Row[]> {
  const res = await fetch("/data/destinations_master_v1.json", { cache: "no-store" });
  const json = await res.json();
  return json.destinations as Row[];
}
