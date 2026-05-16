export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string | null;
          logo_storage_path: string | null;
          about: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug?: string | null;
          logo_storage_path?: string | null;
          about?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };
      jobs: {
        Row: {
          id: string;
          company_id: string;
          recruiter_id: string;
          title: string;
          slug: string;
          role_category: string | null;
          summary: string | null;
          requirements: string[];
          responsibilities: string[];
          nice_to_haves: string[];
          benefits: string[];
          skills: string[];
          location_country: string | null;
          location_city: string | null;
          remote_type: string | null;
          hybrid_office_days_per_week: number | null;
          employment_type: string | null;
          seniority: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          logo_storage_path: string | null;
          screening_threshold: number;
          screening_enabled: boolean;
          application_method: "internal" | "external";
          external_apply_url: string | null;
          status: "draft" | "published" | "closed";
          published_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          recruiter_id: string;
          title: string;
          slug: string;
          role_category?: string | null;
          summary?: string | null;
          requirements?: string[];
          responsibilities?: string[];
          nice_to_haves?: string[];
          benefits?: string[];
          skills?: string[];
          location_country?: string | null;
          location_city?: string | null;
          remote_type?: string | null;
          hybrid_office_days_per_week?: number | null;
          employment_type?: string | null;
          seniority?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          logo_storage_path?: string | null;
          screening_threshold?: number;
          screening_enabled?: boolean;
          application_method?: "internal" | "external";
          external_apply_url?: string | null;
          status?: "draft" | "published" | "closed";
          published_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          cv_storage_path: string | null;
          cv_original_filename: string | null;
          cv_mime_type: string | null;
          cv_file_size: number | null;
          status:
            | "submitted"
            | "processing"
            | "pass"
            | "review"
            | "reject"
            | "error"
            | "withdrawn";
          source: "candidate_apply" | "recruiter_manual";
          consent_accepted: boolean;
          consent_text_version: string | null;
          consent_accepted_at: string | null;
          applied_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          cv_storage_path?: string | null;
          cv_original_filename?: string | null;
          cv_mime_type?: string | null;
          cv_file_size?: number | null;
          status?:
            | "submitted"
            | "processing"
            | "pass"
            | "review"
            | "reject"
            | "error"
            | "withdrawn";
          source?: "candidate_apply" | "recruiter_manual";
          consent_accepted?: boolean;
          consent_text_version?: string | null;
          consent_accepted_at?: string | null;
          applied_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
      };
      screening_results: {
        Row: {
          id: string;
          application_id: string;
          job_id: string;
          overall_score: number;
          recommendation:
            | "strong_match"
            | "possible_match"
            | "weak_match"
            | "not_recommended";
          decision_band: "pass" | "review" | "reject";
          confidence_score: number | null;
          summary: string | null;
          score_breakdown: Json;
          strengths: Json;
          gaps: Json;
          missing_requirements: Json;
          relevant_experience: Json;
          risk_flags: Json;
          suggested_follow_up_questions: Json;
          human_review_note: string | null;
          model_provider: string | null;
          model_name: string | null;
          prompt_version: string | null;
          processing_time_ms: number | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          job_id: string;
          overall_score: number;
          recommendation:
            | "strong_match"
            | "possible_match"
            | "weak_match"
            | "not_recommended";
          decision_band: "pass" | "review" | "reject";
          confidence_score?: number | null;
          summary?: string | null;
          score_breakdown?: Json;
          strengths?: Json;
          gaps?: Json;
          missing_requirements?: Json;
          relevant_experience?: Json;
          risk_flags?: Json;
          suggested_follow_up_questions?: Json;
          human_review_note?: string | null;
          model_provider?: string | null;
          model_name?: string | null;
          prompt_version?: string | null;
          processing_time_ms?: number | null;
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["screening_results"]["Insert"]>;
      };
      scoring_profiles: {
        Row: {
          id: string;
          key: string;
          name: string;
          version: string;
          is_active: boolean;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          version: string;
          is_active?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scoring_profiles"]["Insert"]>;
      };
      recruiter_google_accounts: {
        Row: {
          recruiter_id: string;
          google_email: string;
          encrypted_refresh_token: string;
          scopes: string | null;
          access_token_expires_at: string | null;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          recruiter_id: string;
          google_email: string;
          encrypted_refresh_token: string;
          scopes?: string | null;
          access_token_expires_at?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recruiter_google_accounts"]["Insert"]>;
      };
    };
  };
};
