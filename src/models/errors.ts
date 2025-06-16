export interface PgError extends Error {
    code?: string;
    constraint?: string;
}