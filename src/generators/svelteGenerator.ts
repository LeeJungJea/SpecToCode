import type { ParsedApiSpec } from '../types/specToCode';
import { getFetchFunctionName, getRequestTypeName, getResponseTypeName, toPascalCase } from '../utils/naming';
import { buildUrlExpression, generateCommonTypes, hasFields, renderBodyLines, renderBodyOption, renderHeaderObject, renderResponseParsing } from './frontendUtils';

export const svelteGenerator = {
  generateTypes(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    return generateCommonTypes(spec, requestName, responseName);
  },

  generateFetchFunction(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const functionName = getFetchFunctionName(spec.url);
    const storeName = `create${toPascalCase(functionName)}Store`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    
    const params = [
      hasBody ? `payload: ${requestName}` : '',
      hasFields(spec.headersSchema) ? `headers: ${requestName}Headers` : '',
      hasFields(spec.queryParamsSchema) ? `queryParams: ${requestName}QueryParams` : '',
      hasFields(spec.pathParamsSchema) ? `pathParams: ${requestName}PathParams` : ''
    ].filter(Boolean).join(', ');

    return [
      `import { writable } from 'svelte/store';`,
      ``,
      `export function ${storeName}() {`,
      `  const { subscribe, set, update } = writable({ data: null as ${responseName} | null, error: null as Error | null, isLoading: false });`,
      ``,
      `  const execute = async (${params}) => {`,
      `    update(s => ({ ...s, isLoading: true, error: null }));`,
      `    try {`,
      `      const requestUrl = ${buildUrlExpression(spec).replace(/\n/g, '\n      ')};`,
      ...renderBodyLines(spec).map(line => `    ${line}`),
      `      const response = await fetch(requestUrl, {`,
      `        method: '${spec.method}',`,
      `        headers: {`,
      ...renderHeaderObject(spec).split('\n').map(line => `    ${line}`),
      `        },`,
      `    ${renderBodyOption(spec)}`,
      `      });`,
      ``,
      `      if (!response.ok) throw new Error('API request failed');`,
      `      const data = ${renderResponseParsing(spec)};`,
      `      set({ data, error: null, isLoading: false });`,
      `    } catch (e: any) {`,
      `      set({ data: null, error: e, isLoading: false });`,
      `    }`,
      `  };`,
      ``,
      `  return { subscribe, execute };`,
      `}`
    ].filter((line) => line !== '').join('\n');
  }
};
