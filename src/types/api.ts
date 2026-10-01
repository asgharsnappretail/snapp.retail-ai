/** POST /login — exact backend contract */
export interface LoginRequest {
    username: string;
    password: string;
  }
  
  export interface LoginResponse {
    status: "success" | "error";
    message?: string;
    username?: string;
  }
  
  /** GET /latest-stats — exact backend contract */
  export interface PeakSlot {
    slot_index: number;
    label: string;
    customers: number;
    is_current: boolean;
  }
  
  export interface PeakHour {
    date: string;
    slots: PeakSlot[];
    peak: { slot_index: number; label: string; customers: number };
    current_slot: { slot_index: number; label: string };
    updated_at: string;
  }
  
  export interface LatestStats {
    id: number;
    video_timestamp: string;
    top_items_sold: number;
    pepsi: number;
    redbull: number;
    juice: number;
    prime: number;
    cash_transactions: number;
    bank_transactions: number;
    total_unscanned_transactions: number;
    total_scanned_transactions: number;
    transactions_with_top_items: number;
    total_customers: number;
    customers_at_pos_live: number;
    cashiers_at_pos_live: number;
    total_no_of_cashiers: number;
    total_no_of_staff: number;
    drawer_status: string;
    session_id: string;
    /** exact key as returned by the backend (note the spelling) */
    SCANNED_ANAMOLIES: number;
    /** corrected spelling — read as a fallback if the backend normalizes it later */
    SCANNED_ANOMALIES?: number;
    Flagged_Transactions: number;
    is_streaming: boolean;
    peak_hour?: PeakHour;
  }

  /** Scanner zone — GET /scanner-zone/snapshot & POST /scanner-zone */
export type ZonePolygon = [number, number][];

export interface ZoneSnapshot {
  store_id: number;
  captured_at: string;
  width: number;
  height: number;
  image: string;
  polygon: ZonePolygon | null;
  has_saved_zone: boolean;
  using_default: boolean;
  updated_at: string | null;
  default_polygon: ZonePolygon | null;
  is_streaming: boolean;
}

export interface SaveZoneResponse {
  status: string;
  store_id: number;
  polygon: ZonePolygon;
  previous_polygon: ZonePolygon | null;
  updated_at: string;
}

export interface StartStreamResponse {
  status: string;
  session_id: string;
  recording_filename?: string;
}

export interface StopStreamResponse {
  status?: string;
  session_id?: string;
  download_url?: string;
  [key: string]: unknown;
}