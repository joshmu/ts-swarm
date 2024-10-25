import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  MockInstance,
} from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  let consoleLogSpy: MockInstance;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Mock Date to return a fixed timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-04-01T12:34:56.789Z'));
  });

  afterEach(() => {
    // Restore the original console.log and system time
    console.log = originalConsoleLog;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should log messages with timestamp when debug is true', () => {
    logger(true, 'Test message');
    expect(consoleLogSpy).toHaveBeenCalledWith('12:34:56', 'Test message');
  });

  it('should not log messages when debug is false', () => {
    logger(false, 'Test message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should handle multiple arguments', () => {
    logger(true, 'Message 1', 'Message 2', 123);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '12:34:56',
      'Message 1',
      'Message 2',
      123,
    );
  });

  it('should handle objects and arrays', () => {
    const testObj = { key: 'value' };
    const testArray = [1, 2, 3];
    logger(true, 'Object:', testObj, 'Array:', testArray);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '12:34:56',
      'Object:',
      testObj,
      'Array:',
      testArray,
    );
  });
});
