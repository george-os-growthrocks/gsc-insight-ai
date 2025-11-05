export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          created_at: string
          current_ctr: number | null
          current_position: number | null
          description: string
          effort_level: string
          expected_ctr: number | null
          expected_position: number | null
          expected_traffic_gain: number | null
          id: string
          impact_score: number
          insight_type: string
          metadata: Json | null
          page: string | null
          priority_score: number
          project_id: string
          query: string | null
          title: string
        }
        Insert: {
          created_at?: string
          current_ctr?: number | null
          current_position?: number | null
          description: string
          effort_level: string
          expected_ctr?: number | null
          expected_position?: number | null
          expected_traffic_gain?: number | null
          id?: string
          impact_score: number
          insight_type: string
          metadata?: Json | null
          page?: string | null
          priority_score: number
          project_id: string
          query?: string | null
          title: string
        }
        Update: {
          created_at?: string
          current_ctr?: number | null
          current_position?: number | null
          description?: string
          effort_level?: string
          expected_ctr?: number | null
          expected_position?: number | null
          expected_traffic_gain?: number | null
          id?: string
          impact_score?: number
          insight_type?: string
          metadata?: Json | null
          page?: string | null
          priority_score?: number
          project_id?: string
          query?: string | null
          title?: string
        }
        Relationships: []
      }
      cannibalization_clusters: {
        Row: {
          action_plan: string | null
          avg_position: number
          cannibalization_score: number
          created_at: string
          expected_ctr: number | null
          id: string
          keyword_difficulty: number | null
          primary_page: string
          project_id: string
          query: string
          supporting_pages: Json
          total_clicks: number
          total_impressions: number
          traffic_gain_estimate: number | null
        }
        Insert: {
          action_plan?: string | null
          avg_position: number
          cannibalization_score: number
          created_at?: string
          expected_ctr?: number | null
          id?: string
          keyword_difficulty?: number | null
          primary_page: string
          project_id: string
          query: string
          supporting_pages: Json
          total_clicks?: number
          total_impressions?: number
          traffic_gain_estimate?: number | null
        }
        Update: {
          action_plan?: string | null
          avg_position?: number
          cannibalization_score?: number
          created_at?: string
          expected_ctr?: number | null
          id?: string
          keyword_difficulty?: number | null
          primary_page?: string
          project_id?: string
          query?: string
          supporting_pages?: Json
          total_clicks?: number
          total_impressions?: number
          traffic_gain_estimate?: number | null
        }
        Relationships: []
      }
      competitors: {
        Row: {
          created_at: string
          domain: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_briefs: {
        Row: {
          cluster_id: string | null
          competitor_analysis: string | null
          created_at: string
          id: string
          outline: Json | null
          project_id: string
          seo_recommendations: string | null
          target_keyword: string
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          cluster_id?: string | null
          competitor_analysis?: string | null
          created_at?: string
          id?: string
          outline?: Json | null
          project_id: string
          seo_recommendations?: string | null
          target_keyword: string
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          cluster_id?: string | null
          competitor_analysis?: string | null
          created_at?: string
          id?: string
          outline?: Json | null
          project_id?: string
          seo_recommendations?: string | null
          target_keyword?: string
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "keyword_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          project_id: string
          property_url: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          project_id: string
          property_url: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          project_id?: string
          property_url?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_queries: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date: string
          id: string
          impressions: number
          page: string
          position: number
          project_id: string
          query: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date: string
          id?: string
          impressions?: number
          page: string
          position?: number
          project_id: string
          query: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date?: string
          id?: string
          impressions?: number
          page?: string
          position?: number
          project_id?: string
          query?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_queries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_link_opportunities: {
        Row: {
          anchor_text_suggestions: Json
          created_at: string
          expected_impact: string | null
          from_page: string
          from_page_clicks: number
          id: string
          opportunity_score: number
          project_id: string
          shared_queries: Json
          to_page: string
          to_page_position: number
          topical_overlap: number
        }
        Insert: {
          anchor_text_suggestions: Json
          created_at?: string
          expected_impact?: string | null
          from_page: string
          from_page_clicks: number
          id?: string
          opportunity_score: number
          project_id: string
          shared_queries: Json
          to_page: string
          to_page_position: number
          topical_overlap: number
        }
        Update: {
          anchor_text_suggestions?: Json
          created_at?: string
          expected_impact?: string | null
          from_page?: string
          from_page_clicks?: number
          id?: string
          opportunity_score?: number
          project_id?: string
          shared_queries?: Json
          to_page?: string
          to_page_position?: number
          topical_overlap?: number
        }
        Relationships: []
      }
      keyword_clusters: {
        Row: {
          avg_position: number | null
          cluster_name: string
          created_at: string
          expected_ctr: number | null
          id: string
          intent: string | null
          keyword_difficulty: number | null
          keywords: string[]
          priority_score: number | null
          project_id: string
          similarity_threshold: number | null
          topic_score: number | null
          total_clicks: number | null
          total_impressions: number | null
        }
        Insert: {
          avg_position?: number | null
          cluster_name: string
          created_at?: string
          expected_ctr?: number | null
          id?: string
          intent?: string | null
          keyword_difficulty?: number | null
          keywords: string[]
          priority_score?: number | null
          project_id: string
          similarity_threshold?: number | null
          topic_score?: number | null
          total_clicks?: number | null
          total_impressions?: number | null
        }
        Update: {
          avg_position?: number | null
          cluster_name?: string
          created_at?: string
          expected_ctr?: number | null
          id?: string
          intent?: string | null
          keyword_difficulty?: number | null
          keywords?: string[]
          priority_score?: number | null
          project_id?: string
          similarity_threshold?: number | null
          topic_score?: number | null
          total_clicks?: number | null
          total_impressions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_clusters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analysis: {
        Row: {
          avg_ctr: number
          avg_position: number
          content_quality_score: number | null
          created_at: string
          id: string
          page_url: string
          performance_score: number
          project_id: string
          queries: Json
          seo_metrics: Json | null
          total_clicks: number
          total_impressions: number
          updated_at: string
        }
        Insert: {
          avg_ctr: number
          avg_position: number
          content_quality_score?: number | null
          created_at?: string
          id?: string
          page_url: string
          performance_score: number
          project_id: string
          queries: Json
          seo_metrics?: Json | null
          total_clicks?: number
          total_impressions?: number
          updated_at?: string
        }
        Update: {
          avg_ctr?: number
          avg_position?: number
          content_quality_score?: number | null
          created_at?: string
          id?: string
          page_url?: string
          performance_score?: number
          project_id?: string
          queries?: Json
          seo_metrics?: Json | null
          total_clicks?: number
          total_impressions?: number
          updated_at?: string
        }
        Relationships: []
      }
      pagespeed_metrics: {
        Row: {
          cls: number | null
          created_at: string
          fcp: number | null
          id: string
          lcp: number | null
          page: string
          performance_score: number | null
          project_id: string
          si: number | null
          tbt: number | null
        }
        Insert: {
          cls?: number | null
          created_at?: string
          fcp?: number | null
          id?: string
          lcp?: number | null
          page: string
          performance_score?: number | null
          project_id: string
          si?: number | null
          tbt?: number | null
        }
        Update: {
          cls?: number | null
          created_at?: string
          fcp?: number | null
          id?: string
          lcp?: number | null
          page?: string
          performance_score?: number | null
          project_id?: string
          si?: number | null
          tbt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagespeed_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_tasks: {
        Row: {
          clicks: number | null
          comments: string | null
          created_at: string
          ctr: number | null
          expected_ctr: number | null
          id: string
          impressions: number | null
          page: string
          position: number | null
          potential_click_gain: number | null
          priority: number
          project_id: string
          query: string | null
          reason: string
          recommendation: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          clicks?: number | null
          comments?: string | null
          created_at?: string
          ctr?: number | null
          expected_ctr?: number | null
          id?: string
          impressions?: number | null
          page: string
          position?: number | null
          potential_click_gain?: number | null
          priority?: number
          project_id: string
          query?: string | null
          reason: string
          recommendation: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          clicks?: number | null
          comments?: string | null
          created_at?: string
          ctr?: number | null
          expected_ctr?: number | null
          id?: string
          impressions?: number | null
          page?: string
          position?: number | null
          potential_click_gain?: number | null
          priority?: number
          project_id?: string
          query?: string | null
          reason?: string
          recommendation?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_schedules: {
        Row: {
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          last_sync: string | null
          next_sync: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_sync?: string | null
          next_sync?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_sync?: string | null
          next_sync?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
