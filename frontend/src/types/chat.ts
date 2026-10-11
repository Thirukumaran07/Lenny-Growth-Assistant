export interface Citation {
  chunk_id: string;
  episode_id: string;
  episode_title: string;
  guest: string;
  source_url: string;
  speaker: string;
  timestamp: string;
  quote: string;
  similarity: number;
}

export interface Artifact {
  id: string;
  session_id: string;
  title: string;
  artifact_type: 'html' | 'markdown';
  content: string;
  created_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  artifact_id?: string;
  artifact?: Artifact;
  metadata?: Record<string, any>;
  created_at: string;
  isStreaming?: boolean;
  statusStage?: string;
  statusMessage?: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ModelProviderInfo {
  configured_model: string;
  is_healthy: boolean;
  status_message?: string;
  memory_footprint_mb?: number;
  installed_models?: string[];
}

export interface ModelsStatusResponse {
  active_provider: 'local_ollama' | 'cloud_openai';
  default_provider: string;
  hardware_profile: {
    device: string;
    ram_total_gb: number;
    recommended_local_model: string;
  };
  providers: {
    local_ollama: ModelProviderInfo;
    cloud_openai: ModelProviderInfo;
  };
}

export interface SSEEvent {
  event: 'status' | 'citations' | 'token' | 'artifact' | 'done' | 'error';
  data: any;
}
