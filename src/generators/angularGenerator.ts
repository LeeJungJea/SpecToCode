import type { ParsedApiSpec } from '../types/specToCode';
import { getFetchFunctionName, getRequestTypeName, getResponseTypeName, toPascalCase } from '../utils/naming';
import { buildUrlExpression, generateCommonTypes, hasFields, renderHeaderObject } from './frontendUtils';

export const angularGenerator = {
  generateTypes(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    return generateCommonTypes(spec, requestName, responseName);
  },

  generateFetchFunction(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const functionName = getFetchFunctionName(spec.url);
    const serviceName = `${toPascalCase(functionName)}Service`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    
    const params = [
      hasBody ? `payload: ${requestName}` : '',
      hasFields(spec.headersSchema) ? `headers: ${requestName}Headers` : '',
      hasFields(spec.queryParamsSchema) ? `queryParams: ${requestName}QueryParams` : '',
      hasFields(spec.pathParamsSchema) ? `pathParams: ${requestName}PathParams` : ''
    ].filter(Boolean).join(', ');

    return [
      `import { Injectable } from '@angular/core';`,
      `import { HttpClient, HttpHeaders } from '@angular/common/http';`,
      `import { Observable } from 'rxjs';`,
      ``,
      `@Injectable({ providedIn: 'root' })`,
      `export class ${serviceName} {`,
      `  constructor(private http: HttpClient) {}`,
      ``,
      `  ${functionName}(${params}): Observable<${responseName}> {`,
      `    const requestUrl = ${buildUrlExpression(spec).replace(/\n/g, '\n    ')};`,
      ``,
      `    const options = {`,
      `      headers: new HttpHeaders({`,
      renderHeaderObject(spec).split('\n').map(line => `  ${line}`).join('\n'),
      `      }),`,
      `      responseType: '${spec.responseType.toLowerCase() === 'arraybuffer' ? 'arraybuffer' : spec.responseType}' as const`,
      `    };`,
      ``,
      ...hasBody ? [`    return this.http.request('${spec.method}', requestUrl, { ...options, body: payload });`] : [`    return this.http.request('${spec.method}', requestUrl, options);`],
      `  }`,
      `}`
    ].filter((line) => line !== '').join('\n');
  }
};
