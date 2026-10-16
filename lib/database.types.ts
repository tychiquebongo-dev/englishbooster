export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badges: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description: string
          icon: string
          id: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          caller_id: string
          created_at: string
          duration_seconds: number
          fluency_score: number
          id: string
          receiver_avatar: string | null
          receiver_id: string | null
          receiver_name: string | null
          room_id: string
          status: string
          topic: string | null
          xp_earned: number
        }
        Insert: {
          caller_id: string
          created_at?: string
          duration_seconds?: number
          fluency_score?: number
          id?: string
          receiver_avatar?: string | null
          receiver_id?: string | null
          receiver_name?: string | null
          room_id: string
          status?: string
          topic?: string | null
          xp_earned?: number
        }
        Update: {
          caller_id?: string
          created_at?: string
          duration_seconds?: number
          fluency_score?: number
          id?: string
          receiver_avatar?: string | null
          receiver_id?: string | null
          receiver_name?: string | null
          room_id?: string
          status?: string
          topic?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          ai_feedback: string | null
          audio_url: string | null
          challenge_id: string
          created_at: string
          duration_seconds: number | null
          fluency_score: number | null
          grammar_score: number | null
          id: string
          overall_score: number | null
          transcript: string | null
          user_id: string
          vocabulary_score: number | null
          xp_earned: number
        }
        Insert: {
          ai_feedback?: string | null
          audio_url?: string | null
          challenge_id: string
          created_at?: string
          duration_seconds?: number | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          overall_score?: number | null
          transcript?: string | null
          user_id: string
          vocabulary_score?: number | null
          xp_earned?: number
        }
        Update: {
          ai_feedback?: string | null
          audio_url?: string | null
          challenge_id?: string
          created_at?: string
          duration_seconds?: number | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          overall_score?: number | null
          transcript?: string | null
          user_id?: string
          vocabulary_score?: number | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string
          id: string
          is_daily: boolean
          level: string
          prompt_question: string
          sample_response: string | null
          title: string
          topic: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_daily?: boolean
          level?: string
          prompt_question: string
          sample_response?: string | null
          title: string
          topic: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_daily?: boolean
          level?: string
          prompt_question?: string
          sample_response?: string | null
          title?: string
          topic?: string
          xp_reward?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          conversation_id: string
          created_at: string
          grammar_corrected: string | null
          grammar_explanation: string | null
          id: string
          is_read: boolean
          sender_id: string
          text: string
        }
        Insert: {
          audio_url?: string | null
          conversation_id: string
          created_at?: string
          grammar_corrected?: string | null
          grammar_explanation?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
          text: string
        }
        Update: {
          audio_url?: string | null
          conversation_id?: string
          created_at?: string
          grammar_corrected?: string | null
          grammar_explanation?: string | null
          id?: string
          is_read?: boolean
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          avatar: string
          bio: string | null
          country: string
          created_at: string | null
          flag: string
          id: string
          interests: string[]
          is_online: boolean | null
          level: string
          name: string
          native_language: string
          rating: number | null
          reviews_count: number | null
          specialty: string | null
        }
        Insert: {
          avatar: string
          bio?: string | null
          country: string
          created_at?: string | null
          flag: string
          id?: string
          interests?: string[]
          is_online?: boolean | null
          level?: string
          name: string
          native_language?: string
          rating?: number | null
          reviews_count?: number | null
          specialty?: string | null
        }
        Update: {
          avatar?: string
          bio?: string | null
          country?: string
          created_at?: string | null
          flag?: string
          id?: string
          interests?: string[]
          is_online?: boolean | null
          level?: string
          name?: string
          native_language?: string
          rating?: number | null
          reviews_count?: number | null
          specialty?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          media_type: string | null
          media_url: string | null
          user_id: string
        }
        Insert: {
          category?: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          media_type?: string | null
          media_url?: string | null
          user_id: string
        }
        Update: {
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_type?: string | null
          media_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          current_level: string | null
          email: string | null
          flag: string | null
          full_name: string
          id: string
          interests: string[] | null
          is_online: boolean
          minutes_spoken: number
          native_language: string | null
          plan: string
          plan_status: string
          role: string | null
          streak: number
          target_level: string | null
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          current_level?: string | null
          email?: string | null
          flag?: string | null
          full_name?: string
          id: string
          interests?: string[] | null
          is_online?: boolean
          minutes_spoken?: number
          native_language?: string | null
          plan?: string
          plan_status?: string
          role?: string | null
          streak?: number
          target_level?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          current_level?: string | null
          email?: string | null
          flag?: string | null
          full_name?: string
          id?: string
          interests?: string[] | null
          is_online?: boolean
          minutes_spoken?: number
          native_language?: string | null
          plan?: string
          plan_status?: string
          role?: string | null
          streak?: number
          target_level?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          plan: string
          price_paid: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          price_paid?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          price_paid?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
