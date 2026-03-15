export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;
export const AUTH_TAG_LENGTH = 16;
export const KEY_LENGTH = 32;
export const HEADER_LENGTH = SALT_LENGTH + IV_LENGTH;
export const CIPHER_ALGORITHM = 'aes-256-gcm';