export class InputError extends Error {
  constructor(message = 'Invalid input') {
    super(message);
    this.name = 'InputError';
  }
}