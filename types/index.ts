export interface Climb {
  climb_uuid: string;
  name: string;
  description?: string;
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
  frame_count: number;
  frames_pace: number;
  user_uuid: string;
  username: string;
  product_name: string;
  product_layout_uuid: string;
  angle: number;
  created_at: string;
  updated_at: string;
  is_listed: number;
  is_draft: number;
  curated?: number;
  climb_concat: string;
  ascent_count?: number;
  current_difficulty_id?: number;
  official_kilter_difficulty?: number;
  difficulty_average?: number;
  quality_average?: number;
  fa_username?: string;
  fa_at?: string;
}

export interface ClimbStats {
  climb_uuid: string;
  angle: number;
  ascent_count: number;
  current_difficulty_id: number;
  official_kilter_difficulty?: number;
  difficulty_average?: number;
  quality_average?: number;
  fa_username?: string;
  fa_at?: string;
}

export interface DifficultyGrade {
  id: number;
  display_grade: string;
  v_grade: string;
  color?: string;
}

export interface BleHold {
  position: number;
  role_id: number;
}

export interface ClimbFilters {
  minGrade?: string;
  maxGrade?: string;
  minAscents?: number;
  verified?: boolean;
  sortBy?: 'ascents' | 'quality' | 'difficulty' | 'newest';
  name?: string;
  setter?: string;
  angle?: number;
  boardType?: 'Original' | 'Homewall';
  boardSize?: '7x10' | '8x12' | '12x12' | '16x12' | '10x10' | '10x12';
  page?: number;
  limit?: number;
}
