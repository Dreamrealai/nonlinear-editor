const React = require('react');
const mock = require('./__mocks__/lucide-react.js');

console.log('Film type:', typeof mock.Film);
console.log('Film keys:', Object.keys(mock.Film || {}));
console.log('Film displayName:', mock.Film?.displayName);

// Try to render
try {
  const element = React.createElement(mock.Film, { className: 'test' });
  console.log('Created element successfully');
  console.log('Element type:', typeof element);
  console.log('Element keys:', Object.keys(element));
} catch (error) {
  console.error('Failed to create element:', error.message);
}

// Check all exports
console.log('\nAll mock exports:', Object.keys(mock).slice(0, 20));
console.log('\nDefault export:', typeof mock.default);
