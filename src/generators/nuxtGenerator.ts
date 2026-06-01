import type { ParsedApiSpec } from '../types/specToCode';
import { getFetchFunctionName, getRequestTypeName, getResponseTypeName, toPascalCase } from '../utils/naming';
import { buildUrlExpression, generateCommonTypes, hasFields, renderBodyLines, renderBodyOption, renderHeaderObject } from './frontendUtils';

export const nuxtGenerator = {
  generateTypes(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    return generateCommonTypes(spec, requestName, responseName);
  },

  generateFetchFunction(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const functionName = getFetchFunctionName(spec.url);
    const hookName = `use${toPascalCase(functionName)}`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    
    const params = [
      hasBody ? `payload: ${requestName}` : '',
      hasFields(spec.headersSchema) ? `headers: ${requestName}Headers` : '',
      hasFields(spec.queryParamsSchema) ? `queryParams: ${requestName}QueryParams` : '',
      hasFields(spec.pathParamsSchema) ? `pathParams: ${requestName}PathParams` : ''
    ].filter(Boolean).join(', ');

    return [
      `// Nuxt 3 useFetch wrapper`,
      `export const ${hookName} = (${params}) => {`,
      `  const requestUrl = ${buildUrlExpression(spec).replace(/\n/g, '\n  ')};`,
      ``,
      ...renderBodyLines(spec).map(line => `  ${line}`),
      `  return useFetch<${responseName}>(requestUrl, {`,
      `    method: '${spec.method}',`,
      `    headers: {`,
      renderHeaderObject(spec),
      `    },`,
      `    responseType: '${spec.responseType}',`,
      `    ${renderBodyOption(spec)}`.trim(),
      `  });`,
      `}`
    ].filter((line) => line !== '').join('\n');
  }
};
