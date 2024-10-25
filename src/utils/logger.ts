/**
 * Logs messages with a timestamp.
 */
export function logger(debug: boolean, ...args: any[]): void {
  if (!debug) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(timestamp, ...args);
}
