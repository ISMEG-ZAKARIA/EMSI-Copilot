export interface User {
  id: number;
  email: string;
  full_name?: string;
  role_id: number;
  role_name?: string;
  is_active?: number;
  profile_image?: string;
  created_at: string;
}

export interface AdminAnalytics {
  total_users: number;
  active_students: number;
  total_courses: number;
  total_documents: number;
  total_chats: number;
  usage_stats: { name: string; queries: number }[];
}

export interface Document {
  id: number;
  file_name: string;
  course_id: number;
  created_at: string;
}

export interface Course {
  id: number;
  name: string;
  semester_id: number;
  professor_id: number;
  subject_id: number;
  subject_name?: string;
  description?: string;
  documents?: Document[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}
