import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { KEY_LENGTH } from './cryptoConstants.js';

const scrypt = promisify(crypto.scrypt);

export async function deriveKey(password, salt) {
  return scrypt(password, salt, KEY_LENGTH);
}