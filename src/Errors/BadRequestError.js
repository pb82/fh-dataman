class BadRequestError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message || 'The request could not be understood by the server due to malformed syntax.', fileName, lineNumber);
    this.code = 400;
    this.name = 'BadRequestError';
  }
}

export default BadRequestError;
