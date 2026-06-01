const toWords = (value: string) => {
  return value
    .replace(/\{.*?\}/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

export const capitalize = (value: string) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const toPascalCase = (value: string) => {
  return toWords(value)
    .map((word) => capitalize(word.charAt(0).toLowerCase() + word.slice(1)))
    .join('');
};

export const toCamelCase = (value: string) => {
  const pascal = toPascalCase(value);
  if (!pascal) return 'api';
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

export const getOperationNameFromUrl = (url: string) => {
  const parts = url
    .split('?')[0]
    .split('/')
    .filter((part) => part && !part.startsWith(':') && !part.startsWith('{'));
  return toCamelCase(parts[parts.length - 1] || 'api');
};

export const getRequestTypeName = (url: string) => `${capitalize(getOperationNameFromUrl(url))}Request`;

export const getResponseTypeName = (url: string) => `${capitalize(getOperationNameFromUrl(url))}Response`;

export const getFetchFunctionName = (url: string) => `${getOperationNameFromUrl(url)}Api`;

