export type AppRole = 'admin' | 'manager' | 'worker' | 'finance';
export type UtilityType = 'electricity' | 'water';
export type ReadingStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Site {
  id: string;
  name: string;
  address: string | null;
}

export interface Building {
  id: string;
  site_id: string;
  name: string;
  code: string | null;
}

export interface Meter {
  id: string;
  site_id: string;
  building_id: string | null;
  parent_meter_id: string | null;
  utility_type: UtilityType;
  name: string;
  meter_number: string;
  unit: string;
  multiplication_factor: number;
  initial_reading: number;
  active: boolean;
}

export interface MeterReading {
  id: string;
  meter_id: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  status: ReadingStatus;
  photo_path: string;
  notes: string | null;
  captured_at: string;
  read_by: string;
}
