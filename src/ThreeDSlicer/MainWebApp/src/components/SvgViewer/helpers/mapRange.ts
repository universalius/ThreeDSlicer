/**
 * Convert (re-map) an input value range into a destination range.
 */

const mapRange = (
  value: number,
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number,
): number => {
  return targetStart + ((targetEnd - targetStart) * (value - sourceStart)) / (sourceEnd - sourceStart);
};

export default mapRange;
