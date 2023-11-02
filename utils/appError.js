class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    if (this.statusCode >= 400 && this.statusCode <= 499) {
      this.status = "fail";
    } else {
      this.status = "error";
    }
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;
