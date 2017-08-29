class BufferError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message || 'Received Buffer error', fileName, lineNumber);
    this.code = 22000;
    this.name = 'BufferError';
  }
}

export default BufferError;
