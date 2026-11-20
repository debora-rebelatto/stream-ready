Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, { configurable: true, 
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get cryptoService () {
        return cryptoService;
    },
    get decryptText () {
        return decryptText;
    },
    get default () {
        return _default;
    },
    get encryptText () {
        return encryptText;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _crypto = /*#__PURE__*/ _interop_require_default(require("crypto"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
// Garante que o .env esteja carregado antes de derivar as chaves (ignorado em testes Jest)
const IS_TEST_ENV = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
const currentDir = typeof __dirname !== 'undefined' ? __dirname : __dirname || process.cwd();
const envCandidates = [
    _path.default.join(process.cwd(), '.env'),
    _path.default.join(currentDir, '..', '.env'),
    _path.default.join(currentDir, '..', '..', '.env')
];
if (!IS_TEST_ENV) {
    for (const ENV_FILE of envCandidates){
        if (_fs.default.existsSync(ENV_FILE)) {
            try {
                const envLines = _fs.default.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/);
                for (const line of envLines){
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    const eqIdx = trimmed.indexOf('=');
                    if (eqIdx > 0) {
                        const key = trimmed.slice(0, eqIdx).trim();
                        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                        if (!process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                }
                break;
            } catch (err) {
                console.warn('[Crypto] Failed to read local .env:', err);
            }
        }
    }
}
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const PREFIX = 'enc:';
function getCandidateKeys() {
    const seeds = [
        process.env.ENCRYPTION_KEY,
        process.env.SUPABASE_KEY,
        'stremio-good-quality-tracker-master-key-seed'
    ].filter(Boolean);
    return Array.from(new Set(seeds)).map((s)=>_crypto.default.createHash('sha256').update(s).digest());
}
function encryptText(text) {
    if (!text || typeof text !== 'string') return null;
    if (text.startsWith(PREFIX)) return text;
    try {
        const keys = getCandidateKeys();
        const primaryKey = keys[0];
        const iv = _crypto.default.randomBytes(IV_LENGTH);
        const cipher = _crypto.default.createCipheriv(ALGORITHM, primaryKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('[Crypto] Erro ao criptografar:', err.message);
        return null;
    }
}
function decryptText(cipherText) {
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
        for (const key of keys){
            try {
                const decipher = _crypto.default.createDecipheriv(ALGORITHM, key, iv);
                decipher.setAuthTag(authTag);
                let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            } catch  {
                continue;
            }
        }
        return null;
    } catch  {
        return null;
    }
}
const cryptoService = {
    encryptText,
    decryptText
};
const _default = cryptoService;
