/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Mock for uuid package
 * Provides stable UUIDs for testing
 */

let counter = 0;

function v4() {
  counter++;
  return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}`;
}

function v5() {
  counter++;
  return `00000000-0000-5000-8000-${counter.toString().padStart(12, '0')}`;
}

function reset() {
  counter = 0;
}

module.exports = {
  v4,
  v5,
  reset,
  validate: jest.fn().mockReturnValue(true),
  parse: jest.fn((uuid) => uuid),
  stringify: jest.fn((uuid) => uuid),
};
