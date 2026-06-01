import type { ParsedApiSpec } from '../types/specToCode';
import { getFetchFunctionName, getRequestTypeName, getResponseTypeName, toPascalCase } from '../utils/naming';
import { buildUrlExpression, generateCommonTypes, hasFields, renderBodyLines, renderBodyOption, renderHeaderObject, renderResponseParsing } from './frontendUtils';

export const vanillaTypeScriptGenerator = {
  generateTypes(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    return generateCommonTypes(spec, requestName, responseName);
  },

  generateFetchFunction(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const functionName = getFetchFunctionName(spec.url);
    const className = `${toPascalCase(functionName)}Client`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    
    const params = [
      hasBody ? `payload: ${requestName}` : '',
      hasFields(spec.headersSchema) ? `headers?: ${requestName}Headers` : '',
      hasFields(spec.queryParamsSchema) ? `queryParams?: ${requestName}QueryParams` : '',
      hasFields(spec.pathParamsSchema) ? `pathParams?: ${requestName}PathParams` : ''
    ].filter(Boolean).join(', ');

    return [
      `export class ${className} {`,
      `  static async execute(${params}): Promise<${responseName}> {`,
      `    const requestUrl = ${buildUrlExpression(spec).replace(/\n/g, '\n    ')};`,
      ``,
      ...renderBodyLines(spec).map(line => `  ${line}`),
      `    const response = await fetch(requestUrl, {`,
      `      method: '${spec.method}',`,
      `      headers: {`,
      ...renderHeaderObject(spec).split('\n').map(line => `    ${line}`),
      `      },`,
      `  ${renderBodyOption(spec)}`,
      `    });`,
      ``,
      `    if (!response.ok) {`,
      `      throw new Error('API request failed: ' + response.statusText);`,
      `    }`,
      ``,
      `    return ${renderResponseParsing(spec)};`,
      `  }`,
      `}`
    ].filter((line) => line !== '').join('\n');
  }
};
