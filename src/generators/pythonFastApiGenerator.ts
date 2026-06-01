import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getRequestTypeName, getResponseTypeName, toPascalCase, getOperationNameFromUrl } from '../utils/naming';

const mapType = (field: SchemaField): string => {
  switch (field.type) {
    case 'string':
      return 'str';
    case 'number':
      return 'int';
    case 'boolean':
      return 'bool';
    case 'array':
      if (!field.arrayItem) return 'List[Any]';
      return `List[${mapType(field.arrayItem)}]`;
    case 'object':
      return toPascalCase(field.name);
    case 'null':
      return 'Optional[Any]';
    default:
      return 'Any';
  }
};

const renderModel = (className: string, fields: SchemaField[]): string => {
  const lines: string[] = [];
  lines.push(`class ${className}(BaseModel):`);
  if (fields.length === 0) {
    lines.push('    pass');
    return lines.join('\n');
  }
  fields.forEach((f) => {
    const t = mapType(f);
    const typeStr = f.required ? t : `Optional[${t}]`;
    const optional = f.required ? '' : ' = None';
    lines.push(`    ${f.name}: ${typeStr}${optional}`);
  });
  return lines.join('\n');
};

export const pythonFastApiGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '# This API does not define a request body.';
    const requestName = getRequestTypeName(spec.url);
    const imports = ['from typing import Any, List, Optional', 'from pydantic import BaseModel', ''];
    const models: string[] = [];
    models.push(renderModel(requestName, spec.inputSchema));
    return [...imports, ...models].join('\n');
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    const responseName = getResponseTypeName(spec.url);
    const models: string[] = [];
    models.push(renderModel(responseName, spec.outputSchema));
    return models.join('\n');
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const operation = getOperationNameFromUrl(spec.url);
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const method = spec.method.toLowerCase();
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';

    const lines: string[] = [];
    lines.push('from fastapi import APIRouter, Path, Query, Header, Body');
    lines.push('from typing import Optional');
    lines.push('router = APIRouter()');
    lines.push('');
    lines.push(`@router.${method}('${spec.url}')`);
    const paramsList: string[] = [];
    spec.pathParamsSchema.forEach(f => {
      paramsList.push(`${f.name}: ${mapType(f)} = Path(...)`);
    });
    spec.headersSchema.forEach(f => {
      const varName = f.name.replace(/-/g, '_');
      const defaultValue = f.required ? '...' : 'None';
      const typeStr = f.required ? mapType(f) : `Optional[${mapType(f)}]`;
      paramsList.push(`${varName}: ${typeStr} = Header(${defaultValue}, alias="${f.name}")`);
    });
    spec.queryParamsSchema.forEach(f => {
      const varName = f.name.replace(/-/g, '_');
      const defaultValue = f.required ? '...' : 'None';
      const typeStr = f.required ? mapType(f) : `Optional[${mapType(f)}]`;
      paramsList.push(`${varName}: ${typeStr} = Query(${defaultValue}, alias="${f.name}")`);
    });
    if (hasBody) paramsList.push(`payload: ${requestName} = Body(...)`);
    
    const paramsStr = paramsList.length > 0 ? `\n    ${paramsList.join(',\n    ')}\n` : '';
    lines.push(`async def ${operation}(${paramsStr}):`);
    lines.push('    # TODO: implement endpoint logic');
    lines.push(`    return ${responseName}()`);
    return lines.join('\n');
  }
};
