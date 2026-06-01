import type { ParsedApiSpec } from '../types/specToCode';
import { getFetchFunctionName, getRequestTypeName, getResponseTypeName } from '../utils/naming';
import { buildUrlExpression, generateCommonTypes, hasFields, renderBodyLines, renderBodyOption, renderHeaderObject, renderResponseParsing } from './frontendUtils';

export const nextJsGenerator = {
  generateTypes(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    return generateCommonTypes(spec, requestName, responseName);
  },

  generateFetchFunction(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const functionName = getFetchFunctionName(spec.url);
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    
    const params = [
      hasBody ? `payload: ${requestName}` : '',
      hasFields(spec.headersSchema) ? `headers: ${requestName}Headers` : '',
      hasFields(spec.queryParamsSchema) ? `queryParams: ${requestName}QueryParams` : '',
      hasFields(spec.pathParamsSchema) ? `pathParams: ${requestName}PathParams` : ''
    ].filter(Boolean).join(', ');

    return [
      `'use server';`,
      ``,
      `export async function ${functionName}(${params}): Promise<${responseName}> {`,
      `  const requestUrl = ${buildUrlExpression(spec)};`,
      ``,
      ...renderBodyLines(spec),
      `  const response = await fetch(requestUrl, {`,
      `    method: '${spec.method}',`,
      `    headers: {`,
      renderHeaderObject(spec),
      `    },`,
      renderBodyOption(spec),
      `  });`,
      ``,
      `  if (!response.ok) {`,
      `    throw new Error('API request failed');`,
      `  }`,
      ``,
      `  return ${renderResponseParsing(spec)};`,
      `}`
    ].filter((line) => line !== '').join('\n');
  }
};
