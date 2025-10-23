// Test file to verify pre-commit hooks work
const message = 'Testing Husky pre-commit hooks';
console.log(message);

// This file should be formatted by prettier and linted by eslint
function testFunction() {
  return true;
}

module.exports = { testFunction };
