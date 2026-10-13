const { randomUUID } = require('node:crypto');
const config = require('../config/config');

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const configuredLevel = String(config.LOG_LEVEL).toLowerCase();
const minimumLevel = LEVELS[configuredLevel] ?? LEVELS.info;

const SECRET_FIELD_PATTERN =
  /password|secret|token|authorization|api[_-]?key|credential/i;
const URL_CREDENTIAL_PATTERN =
  /\b(https?|redis):\/\/([^/@\s]+)@/gi;
const QUERY_SECRET_PATTERN =
  /([?&](?:access_token|api[_-]?key|password|secret|token)=)[^&\s]*/gi;
const ASSIGNMENT_SECRET_PATTERN =
  /\b(password|secret|token|authorization|api[_-]?key|credential)(\s*[:=]\s*)(["']?)[^,\s"']+/gi;

function sanitizeText(value) {
  return String(value)
    .replace(URL_CREDENTIAL_PATTERN, '$1://[REDACTED]@')
    .replace(QUERY_SECRET_PATTERN, '$1[REDACTED]')
    .replace(
      ASSIGNMENT_SECRET_PATTERN,
      (_match, key, separator, quote) => `${key}${separator}${quote}[REDACTED]`
    );
}

function sanitizeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      SECRET_FIELD_PATTERN.test(key)
        ? '[REDACTED]'
        : typeof value === 'string'
          ? sanitizeText(value)
          : value
    ])
  );
}

function errorDetails(error, includeStack = true) {
  if (!error || typeof error !== 'object') {
    return { name: 'Error', message: sanitizeText(error) };
  }

  const details = {
    name: sanitizeText(error.name || 'Error'),
    message: sanitizeText(error.message || 'Unknown error')
  };

  if (error.code !== undefined) details.code = sanitizeText(error.code);
  if (includeStack && error.stack) details.stack = sanitizeText(error.stack);

  return details;
}

function write(level, event, fields = {}) {
  if (LEVELS[level] < minimumLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeFields(fields)
  };

  const output = `${JSON.stringify(entry)}\n`;
  if (level === 'error') {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
}

function logRequestError(req, error, event) {
  const statusCode = Number(error?.statusCode) || 500;
  const level = statusCode >= 500 ? 'error' : 'warn';

  write(level, event, {
    request_id: req.id,
    method: req.method,
    path: req.path,
    status_code: statusCode,
    error: errorDetails(error, statusCode >= 500)
  });
}

function requestMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const fields = {
      request_id: req.id,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2))
    };

    if (res.statusCode >= 500) {
      write('error', 'http.request.completed', fields);
    } else {
      write('info', 'http.request.completed', fields);
    }
  });

  next();
}

module.exports = {
  debug: (event, fields) => write('debug', event, fields),
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
  errorDetails,
  logRequestError,
  requestMiddleware
};
