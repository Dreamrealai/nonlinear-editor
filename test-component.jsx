const React = require('react');
const { Film, Trash2 } = require('./__mocks__/lucide-react.js');

console.log('Trash2 type:', typeof Trash2);
console.log('Trash2 is valid:', Trash2 && (typeof Trash2 === 'function' || Trash2.$$typeof));

// Try to use it like the component does
const TestComponent = () => {
  return React.createElement('button', {}, React.createElement(Trash2, { className: 'test' }));
};

try {
  const element = React.createElement(TestComponent);
  console.log('Component created successfully');
} catch (error) {
  console.error('Error creating component:', error.message);
}
