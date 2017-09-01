class RequestEntityTooLargeError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message || 'Request Entity Too Large', fileName, lineNumber);
    this.code = 413;
    this.name = 'RequestEntityTooLargeError';
  }
}

export default RequestEntityTooLargeError;
