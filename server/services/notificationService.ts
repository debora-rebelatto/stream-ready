import crypto from 'crypto';
import nodemailer from 'nodemailer';

export type NotificationChannel = 'telegram' | 'discord' | 'email';

export interface NotificationMoviePayload {
  id: string;
  name: string;
  year?: string;
  poster?: string;
  bestQuality?: string;
  audioFormat?: string;
  hasAtmos?: boolean;
  streamCount?: number;
}

export interface ChannelDispatchResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
}

export interface NotificationChannelAvailability {
  telegramBotConfigured: boolean;
  telegramBotUsername: string | null;
  smtpConfigured: boolean;
  discordSupported: boolean;
}

const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/i;
const TELEGRAM_CHAT_ID_REGEX = /^-?\d{5,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_HEX_REGEX = /^[0-9a-f]{32}$/i;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (timer && typeof (timer as unknown as { unref?: () => void }).unref === 'function') {
    (timer as unknown as { unref: () => void }).unref();
  }
  try {
    return await fetch(url, { ...options, signal: options.signal || controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function validateDiscordWebhookUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
}

export function validateTelegramChatId(chatId: string | number | null | undefined): boolean {
  if (chatId === null || chatId === undefined) return false;
  return TELEGRAM_CHAT_ID_REGEX.test(String(chatId).trim());
}

export function validateEmailAddress(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

export function getAppUrl(fallback?: string): string {
  const raw = fallback || process.env.APP_URL || 'https://stremiowatchlist.vercel.app';
  return raw.replace(/\/+$/, '');
}

export function getNotificationChannelAvailability(): NotificationChannelAvailability {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '') || null;
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();

  return {
    telegramBotConfigured: Boolean(botToken),
    telegramBotUsername: botUsername,
    smtpConfigured: Boolean(smtpHost && smtpUser && smtpPass),
    discordSupported: true,
  };
}

function getSigningSecret(): Buffer {
  const seed =
    process.env.ENCRYPTION_KEY ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.SUPABASE_KEY ||
    'stremio-watchlist-telegram-link-seed';
  return crypto.createHash('sha256').update(seed).digest();
}

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  if (UUID_HEX_REGEX.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  return Buffer.from(uuid, 'utf8');
}

function bytesToUuid(buf: Buffer): string {
  if (buf.length === 16) {
    const hex = buf.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return buf.toString('utf8');
}

/**
 * Generates a stateless HMAC-SHA256 Telegram deep-link token (48 chars for UUIDs, fits Telegram's 64-char limit).
 * Binary layout: [uidBytes][4-byte uint32BE expSec][16-byte HMAC-SHA256] encoded as base64url.
 */
export function createTelegramLinkToken(userId: string, ttlSeconds = 900): string {
  const uidBuf = uuidToBytes(userId);
  const expSec = Math.max(0, Math.floor(Date.now() / 1000) + ttlSeconds);
  const expBuf = Buffer.alloc(4);
  expBuf.writeUInt32BE(expSec, 0);
  const payload = Buffer.concat([uidBuf, expBuf]);
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest()
    .subarray(0, 16);
  return Buffer.concat([payload, sig]).toString('base64url');
}

export function verifyTelegramLinkToken(
  token: string
): { valid: boolean; userId?: string; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing_token' };
  }
  const raw = Buffer.from(token.trim(), 'base64url');
  if (raw.length <= 20) {
    return { valid: false, reason: 'malformed_token' };
  }
  const payload = raw.subarray(0, raw.length - 16);
  const providedSig = raw.subarray(raw.length - 16);
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest()
    .subarray(0, 16);

  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    return { valid: false, reason: 'invalid_signature' };
  }

  const uidBuf = payload.subarray(0, payload.length - 4);
  const expSec = payload.readUInt32BE(payload.length - 4);
  if (Math.floor(Date.now() / 1000) > expSec) {
    return { valid: false, reason: 'expired_token' };
  }

  return { valid: true, userId: bytesToUuid(uidBuf) };
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMovieLinks(movie: NotificationMoviePayload, appUrl?: string) {
  const baseUrl = getAppUrl(appUrl);
  const stremioWebUrl = `https://web.stremio.com/#/detail/movie/${encodeURIComponent(movie.id)}`;
  return { baseUrl, stremioWebUrl };
}

export async function sendTelegramTextMessage(
  chatId: string,
  htmlText: string
): Promise<{ success: boolean; error?: string }> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) {
    return { success: false, error: 'Telegram bot token is not configured on the server.' };
  }
  if (!validateTelegramChatId(chatId)) {
    return { success: false, error: 'Invalid Telegram Chat ID.' };
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatId).trim(),
          text: htmlText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      },
      8000
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { success: false, error: `Telegram API error (${res.status}): ${errBody.slice(0, 140)}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Telegram request failed' };
  }
}

export async function sendTelegramNotification({
  chatId,
  movie,
  appUrl,
  isTest = false,
}: {
  chatId: string;
  movie: NotificationMoviePayload;
  appUrl?: string;
  isTest?: boolean;
}): Promise<ChannelDispatchResult> {
  const { baseUrl, stremioWebUrl } = buildMovieLinks(movie, appUrl);
  const yearLabel = movie.year ? ` (${escapeHtml(movie.year)})` : '';
  const quality = escapeHtml(movie.bestQuality || '1080p FHD');
  const audio = movie.audioFormat ? ` • ${escapeHtml(movie.audioFormat)}` : '';
  const streams = movie.streamCount ? `\n🎬 <b>Sources:</b> ${movie.streamCount} clean streams` : '';
  const prefix = isTest ? '🧪 <b>[Test Alert]</b>\n' : '🎉 <b>Good Quality Release Ready!</b>\n';

  const html =
    `${prefix}` +
    `<b>${escapeHtml(movie.name)}</b>${yearLabel}\n` +
    `✨ <b>Quality:</b> ${quality}${audio}${streams}\n\n` +
    `▶️ <a href="${stremioWebUrl}">Open in Stremio Web</a>  |  ` +
    `📋 <a href="${baseUrl}">View Watchlist</a>`;

  const res = await sendTelegramTextMessage(chatId, html);
  return { channel: 'telegram', ...res };
}

export async function sendDiscordNotification({
  webhookUrl,
  movie,
  appUrl,
  isTest = false,
}: {
  webhookUrl: string;
  movie: NotificationMoviePayload;
  appUrl?: string;
  isTest?: boolean;
}): Promise<ChannelDispatchResult> {
  if (!validateDiscordWebhookUrl(webhookUrl)) {
    return { success: false, channel: 'discord', error: 'Invalid Discord webhook URL.' };
  }

  const { baseUrl, stremioWebUrl } = buildMovieLinks(movie, appUrl);
  const titleSuffix = movie.year ? ` (${movie.year})` : '';
  const fields = [
    { name: 'Quality', value: movie.bestQuality || '1080p FHD', inline: true },
    { name: 'Audio', value: movie.audioFormat || 'Standard', inline: true },
  ];
  if (movie.streamCount) {
    fields.push({ name: 'Clean Streams', value: String(movie.streamCount), inline: true });
  }

  const embed: Record<string, unknown> = {
    title: `${isTest ? '[Test] ' : ''}${movie.name}${titleSuffix}`,
    description: `Now available in good quality! [Open in Stremio Web](${stremioWebUrl}) • [Dashboard](${baseUrl})`,
    color: isTest ? 0x8b5cf6 : 0x10b981,
    fields,
    footer: { text: 'Stremio Watchlist • Good Quality Tracker' },
    timestamp: new Date().toISOString(),
  };
  if (movie.poster && /^https?:\/\//i.test(movie.poster)) {
    embed.thumbnail = { url: movie.poster };
  }

  try {
    const res = await fetchWithTimeout(
      webhookUrl.trim(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Stremio Watchlist',
          embeds: [embed],
        }),
      },
      8000
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        success: false,
        channel: 'discord',
        error: `Discord webhook error (${res.status}): ${errBody.slice(0, 140)}`,
      };
    }
    return { success: true, channel: 'discord' };
  } catch (err: any) {
    return { success: false, channel: 'discord', error: err?.message || 'Discord request failed' };
  }
}

export async function sendEmailNotification({
  to,
  movie,
  appUrl,
  isTest = false,
}: {
  to: string;
  movie: NotificationMoviePayload;
  appUrl?: string;
  isTest?: boolean;
}): Promise<ChannelDispatchResult> {
  if (!validateEmailAddress(to)) {
    return { success: false, channel: 'email', error: 'Invalid recipient email address.' };
  }

  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  if (!host || !user || !pass) {
    return {
      success: false,
      channel: 'email',
      error: 'SMTP email delivery is not configured on the server.',
    };
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = (process.env.SMTP_FROM || '').trim() || `Stremio Watchlist <${user}>`;
  const { baseUrl, stremioWebUrl } = buildMovieLinks(movie, appUrl);
  const yearLabel = movie.year ? ` (${movie.year})` : '';
  const quality = movie.bestQuality || '1080p FHD';
  const audio = movie.audioFormat ? ` • ${movie.audioFormat}` : '';
  const subjectPrefix = isTest ? '[Test] ' : '';
  const subject = `${subjectPrefix}${movie.name}${yearLabel} is now ready in ${quality}`;

  const text =
    `${subjectPrefix}Good quality release detected!\n\n` +
    `Movie: ${movie.name}${yearLabel}\n` +
    `Quality: ${quality}${audio}\n` +
    (movie.streamCount ? `Sources: ${movie.streamCount} clean streams\n` : '') +
    `\nOpen in Stremio Web: ${stremioWebUrl}\n` +
    `View Watchlist: ${baseUrl}\n`;

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;background:#0c0d14;color:#f3f4f6;padding:24px;border-radius:12px;max-width:520px;margin:0 auto;">
      <p style="color:#a78bfa;font-size:12px;font-weight:700;text-transform:uppercase;margin:0 0 8px;">
        ${isTest ? 'Test Alert • ' : ''}Stremio Watchlist
      </p>
      <h2 style="margin:0 0 12px;color:#ffffff;font-size:20px;">
        ${escapeHtml(movie.name)}${escapeHtml(yearLabel)}
      </h2>
      <p style="margin:0 0 16px;color:#d1d5db;font-size:14px;">
        Now available in <strong style="color:#34d399;">${escapeHtml(quality)}${escapeHtml(audio)}</strong>
        ${movie.streamCount ? ` (${movie.streamCount} clean streams)` : ''}.
      </p>
      <div style="margin-top:20px;">
        <a href="${stremioWebUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;margin-right:8px;">
          Open in Stremio
        </a>
        <a href="${baseUrl}" style="display:inline-block;background:#1f2937;color:#e5e7eb;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">
          View Watchlist
        </a>
      </div>
    </div>
  `.trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  try {
    await transporter.sendMail({ from, to: to.trim(), subject, text, html });
    return { success: true, channel: 'email' };
  } catch (err: any) {
    return { success: false, channel: 'email', error: err?.message || 'SMTP send failed' };
  } finally {
    if (typeof transporter.close === 'function') {
      transporter.close();
    }
  }
}

export const notificationService = {
  validateDiscordWebhookUrl,
  validateTelegramChatId,
  validateEmailAddress,
  getAppUrl,
  getNotificationChannelAvailability,
  createTelegramLinkToken,
  verifyTelegramLinkToken,
  sendTelegramTextMessage,
  sendTelegramNotification,
  sendDiscordNotification,
  sendEmailNotification,
};

export default notificationService;
