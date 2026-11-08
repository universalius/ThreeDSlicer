const needPrefix = (cursor: string): boolean => ['zoom-in', 'zoom-out', 'grab', 'grabbing'].includes(cursor);

const userAgent = (): string => navigator.userAgent.toLowerCase();
const isFirefox = (): boolean => userAgent().includes('firefox');
const isWebkit = (): boolean => userAgent().includes('webkit');

const prefixCursor = (cursor: string): string => {
  if (!needPrefix(cursor)) {
    return cursor;
  }

  if (isFirefox()) {
    return `-moz-${cursor}`;
  }

  if (isWebkit()) {
    return `-webkit-${cursor}`;
  }

  return cursor;
};

export default prefixCursor;
