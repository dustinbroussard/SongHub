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
      hub_bands: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      hub_band_members: {
        Row: {
          band_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          band_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          band_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      songs: {
        Row: {
          id: string;
          band_id: string;
          work_title: string;
          lyrics: string;
          notes: string;
          metadata: {
            title?: string;
            artist?: string;
            key?: string;
            tempo?: string;
            genre?: string;
          } | null;
          audio_files: {
            id: string;
            name: string;
            type: string;
            size: number;
            uploaded_by: string;
            uploaded_at: string;
            storage_path: string;
            url?: string;
          }[] | null;
          created_at: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          band_id: string;
          work_title: string;
          lyrics?: string;
          notes?: string;
          metadata?: {
            title?: string;
            artist?: string;
            key?: string;
            tempo?: string;
            genre?: string;
          } | null;
          audio_files?: {
            id: string;
            name: string;
            type: string;
            size: number;
            uploaded_by: string;
            uploaded_at: string;
            storage_path: string;
            url?: string;
          }[] | null;
          created_at?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          id?: string;
          band_id?: string;
          work_title?: string;
          lyrics?: string;
          notes?: string;
          metadata?: {
            title?: string;
            artist?: string;
            key?: string;
            tempo?: string;
            genre?: string;
          } | null;
          audio_files?: {
            id: string;
            name: string;
            type: string;
            size: number;
            uploaded_by: string;
            uploaded_at: string;
            storage_path: string;
            url?: string;
          }[] | null;
          created_at?: string;
          updated_at?: string;
          updated_by?: string;
        };
      };
      band_members: {
        Row: {
          id: string;
          band_id: string;
          user_id: string;
          user_name: string;
          avatar_url?: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          band_id: string;
          user_id: string;
          user_name: string;
          avatar_url?: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          band_id?: string;
          user_id?: string;
          user_name?: string;
          avatar_url?: string;
          role?: string;
          created_at?: string;
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
      hub_new_ideas: {
        Row: {
          id: string;
          band_id: string;
          title: string;
          created_by: string;
          lyrics: string;
          tempo: number | null;
          key: string | null;
          genre: string | null;
          artist: string | null;
          project_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          band_id: string;
          title?: string;
          created_by: string;
          lyrics?: string;
          tempo?: number | null;
          key?: string | null;
          genre?: string | null;
          artist?: string | null;
          project_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          band_id?: string;
          title?: string;
          created_by?: string;
          lyrics?: string;
          tempo?: number | null;
          key?: string | null;
          genre?: string | null;
          artist?: string | null;
          project_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      hub_new_idea_audio_versions: {
        Row: {
          id: string;
          idea_id: string;
          uploaded_by: string;
          display_name: string;
          original_file_name: string | null;
          storage_bucket: string;
          storage_path: string;
          mime_type: string | null;
          byte_size: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          uploaded_by: string;
          display_name: string;
          original_file_name?: string | null;
          storage_bucket?: string;
          storage_path: string;
          mime_type?: string | null;
          byte_size?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          uploaded_by?: string;
          display_name?: string;
          original_file_name?: string | null;
          storage_bucket?: string;
          storage_path?: string;
          mime_type?: string | null;
          byte_size?: number | null;
          created_at?: string;
          updated_at?: string;
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
