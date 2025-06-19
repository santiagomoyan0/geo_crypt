export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export interface File {
    id: number;
    filename: string;
    mimetype: string;
    size: number;
    hashed_geohash: string;
    user_id: number;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterCredentials extends LoginCredentials {
    email: string;
} 