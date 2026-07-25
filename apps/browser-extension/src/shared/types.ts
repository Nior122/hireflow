export interface DetectedJob {
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  requirements: string | null;
  skills: string[];
  applicationUrl: string;
  companyLogo: string | null;
  postedAt: string | null;
  source: string;
  confidence: number;
}

export interface AuthState {
  authenticated: boolean;
  userId: string | null;
  token: string | null;
}

export interface ExtensionSettings {
  darkMode: boolean;
  autoSave: boolean;
  defaultResumeId: string | null;
  notificationsEnabled: boolean;
  reminderDays: number;
}

export interface OfflineAction {
  id: string;
  type: "save_job" | "update_status" | "add_note";
  data: unknown;
  timestamp: number;
}
