import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Garante que o .env esteja carregado antes de derivar as chaves
const currentDir =
  typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname || process.cwd();
const envCandidates = [
  path.join(process.cwd(), '.env'),
  path.join(currentDir, '..', '.env'),
  path.join(currentDir, '..', '..', '.env'),
];
for (const ENV_FILE of envCandidates) {
  if (fs.existsSync(ENV_FILE)) {
    try {
      const envLines = fs.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/);
      for (const line of envLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed
            .slice(eqIdx + 1)
            .trim()
            .replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    } catch (e) {
      // Ignora erro se não conseguir ler .env
    }
  }
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const PREFIX = 'enc:';

function getCandidateKeys(): Buffer[] {
  const seeds = [
    process.env.ENCRYPTION_KEY,
    process.env.SUPABASE_KEY,
    'stremio-good-quality-tracker-master-key-seed',
  ].filter(Boolean) as string[];
  return Array.from(new Set(seeds)).map((s) => crypto.createHash('sha256').update(s).digest());
}

/**
 * Criptografa uma string usando AES-256-GCM com IV aleatório e autenticação (Auth Tag).
 * O formato de saída é 'enc:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>'.
 */
export function encryptText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  if (text.startsWith(PREFIX)) return text;

  try {
    const keys = getCandidateKeys();
    const primaryKey = keys[0];
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, primaryKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err: any) {
    console.error('[Crypto] Erro ao criptografar:', err.message);
    return null;
  }
}

/**
 * Descriptografa uma string criptografada com AES-256-GCM.
 * Se a string não tiver o prefixo de criptografia (legado em texto puro), retorna como está.
 * Testa chaves candidatas para garantir compatibilidade caso as variáveis de ambiente variem.
 */
export function decryptText(cipherText: string | null | undefined): string | null {
  if (!cipherText || typeof cipherText !== 'string') return null;
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
    const keys = getCandidateKeys();

    for (const key of keys) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (e) {
        // Tenta próxima chave candidata
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

export const cryptoService = {
  encryptText,
  decryptText,
};

export default cryptoService;
