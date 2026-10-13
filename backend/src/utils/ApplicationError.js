class ApplicationError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.name = 'ApplicationError';
    if (statusCode !== undefined) this.statusCode = statusCode;

    Error.captureStackTrace?.(this, ApplicationError);
  }
}

module.exports = ApplicationError;
