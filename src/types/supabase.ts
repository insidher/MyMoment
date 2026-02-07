export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    name: string | null
                    image: string | null
                    updated_at: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email: string
                    name?: string | null
                    image?: string | null
                    updated_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string | null
                    image?: string | null
                    updated_at?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            track_sources: {
                Row: {
                    id: string
                    service: string
                    source_url: string
                    title: string | null
                    artist: string | null
                    artwork: string | null
                    duration_sec: number | null
                    canonical_track_id: string | null
                    youtube_video_id: string | null
                    description: string | null
                    channel_title: string | null
                    view_count: number | null
                    category_id: string | null
                    tags: string[] | null
                    metadata_updated_at: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    service: string
                    source_url: string
                    title?: string | null
                    artist?: string | null
                    artwork?: string | null
                    duration_sec?: number | null
                    canonical_track_id?: string | null
                    youtube_video_id?: string | null
                    description?: string | null
                    channel_title?: string | null
                    view_count?: number | null
                    category_id?: string | null
                    tags?: string[] | null
                    metadata_updated_at?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    service?: string
                    source_url?: string
                    title?: string | null
                    artist?: string | null
                    artwork?: string | null
                    duration_sec?: number | null
                    canonical_track_id?: string | null
                    youtube_video_id?: string | null
                    description?: string | null
                    channel_title?: string | null
                    view_count?: number | null
                    category_id?: string | null
                    tags?: string[] | null
                    metadata_updated_at?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            moments: {
                Row: {
                    id: string
                    user_id: string
                    resource_id: string | null
                    platform: string
                    track_source_id: string | null
                    parent_id: string | null
                    start_time: number
                    end_time: number
                    note: string | null
                    title: string | null
                    artist: string | null
                    artwork: string | null
                    like_count: number | null
                    saved_by_count: number | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    resource_id?: string | null
                    platform: string
                    track_source_id?: string | null
                    parent_id?: string | null
                    start_time: number
                    end_time: number
                    note?: string | null
                    title?: string | null
                    artist?: string | null
                    artwork?: string | null
                    like_count?: number | null
                    saved_by_count?: number | null
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    resource_id?: string | null
                    platform?: string
                    track_source_id?: string | null
                    parent_id?: string | null
                    start_time?: number
                    end_time?: number
                    note?: string | null
                    title?: string | null
                    artist?: string | null
                    artwork?: string | null
                    like_count?: number | null
                    saved_by_count?: number | null
                    created_at?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "moments_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "moments_track_source_id_fkey"
                        columns: ["track_source_id"]
                        referencedRelation: "track_sources"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "moments_parent_id_fkey"
                        columns: ["parent_id"]
                        referencedRelation: "moments"
                        referencedColumns: ["id"]
                    }
                ]
            }
            likes: {
                Row: {
                    id: string
                    user_id: string
                    moment_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    moment_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    moment_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "likes_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "likes_moment_id_fkey"
                        columns: ["moment_id"]
                        referencedRelation: "moments"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
    }
}