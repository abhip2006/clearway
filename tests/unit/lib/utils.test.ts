/**
 * Unit Tests: Utility Functions
 *
 * Tests core utility functions used throughout the application
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn() - className merger', () => {
    it('should merge class names', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('should handle conflicting Tailwind classes', () => {
      const result = cn('text-red-500', 'text-blue-500');
      // Should keep only the last one (twMerge behavior)
      expect(result).toContain('text-blue-500');
      expect(result).not.toContain('text-red-500');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('should handle false conditionals', () => {
      const isActive = false;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).not.toContain('active-class');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class');
      expect(result).toContain('base-class');
      expect(result).toContain('valid-class');
    });

    it('should handle array of classes', () => {
      const result = cn(['class1', 'class2', 'class3']);
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle object with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toContain('class1');
      expect(result).not.toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle complex Tailwind utilities', () => {
      const result = cn(
        'px-4 py-2',
        'hover:bg-blue-500',
        'dark:text-white',
        'md:text-lg'
      );
      expect(result).toContain('px-4');
      expect(result).toContain('hover:bg-blue-500');
      expect(result).toContain('dark:text-white');
      expect(result).toContain('md:text-lg');
    });
  });
});
