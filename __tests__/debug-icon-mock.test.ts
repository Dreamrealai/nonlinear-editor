import { Undo } from 'lucide-react';

describe('Icon Mock Debug', () => {
  it('should load mocked icon', () => {
    console.log('Undo:', Undo);
    console.log('Undo type:', typeof Undo);
    console.log('Undo.displayName:', (Undo as any).displayName);
  });
});
