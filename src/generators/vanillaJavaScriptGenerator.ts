import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getFetchFunctionName, getRequestTypeName, getResponseTypeName, toPascalCase } from '../utils/naming';
import { buildUrlExpression, hasFields, renderBodyLines, renderBodyOption, renderHeaderObject, renderResponseParsing } from './frontendUtils';

const renderJsDocProperties = (fields: SchemaField[]) => {
  return fields.map(f => {
    const type = f.type === 'array' ? 'Array' : f.type === 'object' ? 'Object' : f.type;
    return ` * @property {${type}}${f.required ? '' : '='} ${f.name}`;
  }).join('\n');
};

const renderJsDocTypedef = (name: string, fields: SchemaField[]) => {
  if (!fields || fields.length === 0) return `/**\n * @typedef {Object} ${name}\n */`;
  return [
    `/**`,
    ` * @typedef {Object} ${name}`,
    renderJsDocProperties(fields),
    ` */`
  ].join('\n');
};

export const vanillaJavaScriptGenerator = {
  generateTypes(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    
    const chunks = [
      hasFields(spec.headersSchema) ? renderJsDocTypedef(`${requestName}Headers`, spec.headersSchema) : '',
      hasFields(spec.queryParamsSchema) ? renderJsDocTypedef(`${requestName}QueryParams`, spec.queryParamsSchema) : '',
      hasFields(spec.pathParamsSchema) ? renderJsDocTypedef(`${requestName}PathParams`, spec.pathParamsSchema) : '',
      hasFields(spec.inputSchema) ? renderJsDocTypedef(requestName, spec.inputSchema) : '',
      hasFields(spec.outputSchema) ? renderJsDocTypedef(responseName, spec.outputSchema) : ''
    ];
    return chunks.filter(Boolean).join('\n\n');
  },

  generateFetchFunction(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const functionName = getFetchFunctionName(spec.url);
    const className = `${toPascalCase(functionName)}Client`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    
    const paramsList = [
      hasBody ? `payload` : '',
      hasFields(spec.headersSchema) ? `headers` : '',
      hasFields(spec.queryParamsSchema) ? `queryParams` : '',
      hasFields(spec.pathParamsSchema) ? `pathParams` : ''
    ].filter(Boolean);
    const paramsStr = paramsList.join(', ');

    const jsdocParams = [
      hasBody ? `   * @param {${requestName}} payload` : '',
      hasFields(spec.headersSchema) ? `   * @param {${requestName}Headers} [headers]` : '',
      hasFields(spec.queryParamsSchema) ? `   * @param {${requestName}QueryParams} [queryParams]` : '',
      hasFields(spec.pathParamsSchema) ? `   * @param {${requestName}PathParams} [pathParams]` : ''
    ].filter(Boolean).join('\n');

    return [
      `export class ${className} {`,
      `  /**`,
      jsdocParams,
      `   * @returns {Promise<${responseName}>}`,
      `   */`,
      `  static async execute(${paramsStr}) {`,
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
