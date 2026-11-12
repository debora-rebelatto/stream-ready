const crypto = require('crypto');

// Master encryption key derived from environment variable ENCRYPTION_KEY or a secure app-level secret
const SECRET_SEED = process.env.ENCRYPTION_KEY || process.env.SUPABASE_KEY || 'stremio-good-quality-tracker-master-key-seed';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest(); // 32 bytes for AES-256

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const PREFIX = 'enc:';

/**
 * Criptografa uma string usando AES-256-GCM com IV aleatório e autenticação (Auth Tag).
 * O formato de saída é 'enc:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>'.
 */
function encryptText(text) {
  if (!text || typeof text !== 'string') return null;
  // Se já estiver criptografado, não criptografa novamente
  if (text.startsWith(PREFIX)) return text;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[Crypto] Erro ao criptografar:', err.message);
    return null;
  }
}

/**
 * Descriptografa uma string criptografada com AES-256-GCM.
 * Se a string não tiver o prefixo de criptografia (legado em texto puro), retorna como está.
 */
function decryptText(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return null;
  // Compatibilidade com chaves legadas não criptografadas salvas antes da migração
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText;
  }

  try {
    const parts = cipherText.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      return null;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.warn('[Crypto] Falha ao descriptografar:', err.message);
    return null;
  }
}

module.exports = {
  encryptText,
  decryptText
};
