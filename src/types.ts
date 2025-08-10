
export type VisaType = "visa_free" | "evisa" | "voa" | "visa_required";

export type Privilege =
  | "US_visa"
  | "UK_visa"
  | "Schengen_visa"
  | "Japan_visa"
  | "Australia_visa"
  | "Canada_visa"
  | "GCC_residence";

export type AccessRule = {
  visaType: VisaType;
  notes?: string;
  requiresAnyPrivileges?: Privilege[];
  requiresAllPrivileges?: Privilege[];
};

export type Country = {
  name: string;
  iso2: string;
  region: string;
  flag?: string;
  base?: AccessRule;
  conditional?: AccessRule[];
  flightHoursFromDEL?: number;
  bestMonths?: number[];
};
