// Operational error carrying an HTTP status + machine readable code.
export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
  static badRequest(msg = 'Bad request', details) { return new ApiError(400, msg, 'BAD_REQUEST', details); }
  static unauthorized(msg = 'Not authenticated', code = 'UNAUTHORIZED') { return new ApiError(401, msg, code); }
  static forbidden(msg = 'You do not have permission to do that') { return new ApiError(403, msg, 'FORBIDDEN'); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg, 'NOT_FOUND'); }
  static conflict(msg = 'Conflict') { return new ApiError(409, msg, 'CONFLICT'); }
}
