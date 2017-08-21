class InsertReceivedBufferError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message || 'InsertStream Received Buffer error', fileName, lineNumber);
    this.code = 22000;
    this.name = 'InsertReceivedBufferError';
  }
}

export default InsertReceivedBufferError;
