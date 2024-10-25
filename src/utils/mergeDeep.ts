/**
 * Recursively merges fields from the source object into the target object.
 * Handles arrays by replacing them instead of merging.
 */
export function mergeDeep(target: any, source: any): any {
  if (Array.isArray(source)) {
    return [...source];
  }
  if (typeof source !== 'object' || source === null) {
    return source;
  }
  return Object.keys(source).reduce(
    (acc, key) => {
      const sourceValue = source[key];
      const targetValue = acc[key];

      if (typeof sourceValue === 'string') {
        acc[key] =
          (typeof targetValue === 'string' ? targetValue : '') + sourceValue;
      } else {
        acc[key] = mergeDeep(targetValue, sourceValue);
      }

      return acc;
    },
    { ...target },
  );
}
