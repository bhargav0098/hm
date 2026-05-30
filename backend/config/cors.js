/**
 * Build allowed origins from FRONTEND_URL and ALLOWED_ORIGINS (comma-separated).
 * Trailing slashes are stripped so they match browser Origin headers.
 */
function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function getAllowedOrigins() {
  const origins = new Set();

  const add = (url) => {
    const normalized = normalizeOrigin(url);
    if (normalized) origins.add(normalized);
  };

  add(process.env.FRONTEND_URL);

  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((entry) => add(entry));
  }

  if (process.env.NODE_ENV !== 'production') {
    add('http://localhost:5173');
    add('http://localhost:5174');
  }

  if (origins.size === 0) {
    add('http://localhost:5173');
  }

  return [...origins];
}

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    // Same-origin or non-browser clients (curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    const normalized = normalizeOrigin(origin);
    if (normalized && allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
  maxAge: 86400,
};

module.exports = { corsOptions, getAllowedOrigins, normalizeOrigin };
