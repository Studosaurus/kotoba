export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vocabulary_items: {
        Row: {
          id: string;
          user_id: string;
          original_phrase: string;
          normalized_form: string;
          reading_kana: string;
          concise_meaning: string;
          natural_translation: string;
          grammar_explanation: string | null;
          example_sentence: string | null;
          example_sentence_reading: string | null;
          example_sentence_translation: string | null;
          jlpt_estimate: string | null;
          suggested_tags: string[];
          confidence: "low" | "medium" | "high";
          source_context: Json;
          provenance: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_phrase: string;
          normalized_form: string;
          reading_kana: string;
          concise_meaning: string;
          natural_translation: string;
          grammar_explanation?: string | null;
          example_sentence?: string | null;
          example_sentence_reading?: string | null;
          example_sentence_translation?: string | null;
          jlpt_estimate?: string | null;
          suggested_tags?: string[];
          confidence?: "low" | "medium" | "high";
          source_context?: Json;
          provenance?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vocabulary_items"]["Insert"]>;
        Relationships: [];
      };
      learner_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          payload: Json;
          provenance: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          payload?: Json;
          provenance?: Json;
          occurred_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["learner_events"]["Insert"]>;
        Relationships: [];
      };
      study_items: {
        Row: {
          id: string;
          user_id: string;
          kind: "vocabulary";
          source_entity_id: string;
          status: "due" | "scheduled" | "retired";
          due_at: string;
          last_reviewed_at: string | null;
          review_count: number;
          provenance: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind?: "vocabulary";
          source_entity_id: string;
          status?: "due" | "scheduled" | "retired";
          due_at?: string;
          last_reviewed_at?: string | null;
          review_count?: number;
          provenance?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["study_items"]["Insert"]>;
        Relationships: [];
      };
      review_results: {
        Row: {
          id: string;
          user_id: string;
          study_item_id: string;
          rating: "again" | "hard" | "good" | "easy";
          reviewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          study_item_id: string;
          rating: "again" | "hard" | "good" | "easy";
          reviewed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["review_results"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
