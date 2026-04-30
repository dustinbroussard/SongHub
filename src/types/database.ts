export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bands: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      band_members: {
        Row: {
          id: string;
          band_id: string;
          user_id: string;
          user_email: string;
          user_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'member';
          joined_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          band_id: string;
          user_id: string;
          user_email: string;
          user_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'member';
          joined_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          band_id?: string;
          user_id?: string;
          user_email?: string;
          user_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'member';
          joined_at?: string;
          last_seen_at?: string;
        };
      };
      songs: {
        Row: {
          id: string;
          band_id: string;
          created_by: string;
          work_title: string;
          metadata: {
            title?: string;
            artist?: string;
            key?: string;
            tempo?: string;
            genre?: string;
          };
          lyrics: string;
          notes: string;
          audio_files: {
            id: string;
            name: string;
            type: string;
            size: number;
            uploaded_by: string;
            uploaded_at: string;
            storage_path: string;
          }[];
          created_at: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          band_id: string;
          created_by: string;
          work_title: string;
          metadata?: {
            title?: string;
            artist?: string;
            key?: string;
            tempo?: string;
            genre?: string;
          };
          lyrics?: string;
          notes?: string;
          audio_files?: {
            id: string;
            name: string;
            type: string;
            size: number;
            uploaded_by: string;
            uploaded_at: string;
            storage_path: string;
          }[];
          created_at?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          id?: string;
          band_id?: string;
          created_by?: string;
          work_title?: string;
          metadata?: {
            title?: string;
            artist?: string;
            key?: string;
            tempo?: string;
            genre?: string;
          };
          lyrics?: string;
          notes?: string;
          audio_files?: {
            id: string;
            name: string;
            type: string;
            size: number;
            uploaded_by: string;
            uploaded_at: string;
            storage_path: string;
          }[];
          created_at?: string;
          updated_at?: string;
          updated_by?: string;
        };
      };
      song_feedback: {
        Row: {
          id: string;
          song_id: string;
          band_id: string;
          user_id: string;
          user_name: string;
          feedback: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          band_id: string;
          user_id: string;
          user_name: string;
          feedback: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          song_id?: string;
          band_id?: string;
          user_id?: string;
          user_name?: string;
          feedback?: string;
          created_at?: string;
        };
      };
      user_last_seen: {
        Row: {
          user_id: string;
          band_id: string;
          last_seen_at: string;
        };
        Insert: {
          user_id: string;
          band_id: string;
          last_seen_at?: string;
        };
        Update: {
          user_id?: string;
          band_id?: string;
          last_seen_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          band_id: string;
          song_id: string;
          type: 'song_created' | 'song_updated';
          message: string;
          from_user_id: string;
          from_user_name: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          band_id: string;
          song_id: string;
          type: 'song_created' | 'song_updated';
          message: string;
          from_user_id: string;
          from_user_name: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          band_id?: string;
          song_id?: string;
          type?: 'song_created' | 'song_updated';
          message?: string;
          from_user_id?: string;
          from_user_name?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
