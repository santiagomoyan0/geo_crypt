export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
} 