import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getRequestTypeName, getResponseTypeName, getOperationNameFromUrl, toPascalCase } from '../utils/naming';

const mapType = (field: SchemaField) => {
  switch (field.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'long';
    case 'boolean':
      return 'bool';
    default:
      return 'object';
  }
};

const renderRecord = (name: string, fields: SchemaField[]) => {
  if (fields.length === 0) return `public record ${name}();`;
  const props = fields.map((f) => `${mapType(f)}${f.required ? '' : '?'} ${f.name}${f.required ? '' : ' = null'}`).join(', ');
  return `public record ${name}(${props});`;
};

export const csharpDotnetGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '// This API does not define a request body.';
    const name = getRequestTypeName(spec.url);
    return renderRecord(name, spec.inputSchema);
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    const name = getResponseTypeName(spec.url);
    return renderRecord(name, spec.outputSchema);
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const op = getOperationNameFromUrl(spec.url);
    const req = getRequestTypeName(spec.url);
    const res = getResponseTypeName(spec.url);
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';
    const opPascal = toPascalCase(op);
    const methodAttr = `[Http${spec.method === 'DELETE' ? 'Delete' : spec.method === 'GET' ? 'Get' : spec.method === 'PUT' ? 'Put' : 'Post'}("${spec.url}")]`;
    const paramsList: string[] = [];
    spec.pathParamsSchema.forEach(f => {
      paramsList.push(`[FromRoute] ${mapType(f)} ${f.name}`);
    });
    spec.headersSchema.forEach(f => {
      paramsList.push(`[FromHeader(Name = "${f.name}")] string${f.required ? '' : '?'} ${f.name.replace(/-/g, '_')}`);
    });
    spec.queryParamsSchema.forEach(f => {
      paramsList.push(`[FromQuery] ${mapType(f)}${f.required ? '' : '?'} ${f.name}`);
    });
    if (hasBody) paramsList.push(`[FromBody] ${req} payload`);

    const paramsStr = paramsList.length > 0 ? `\n    ${paramsList.join(',\n    ')}\n  ` : '';

    const getDefaultValue = (f: SchemaField) => {
      switch (f.type) {
        case 'string': return '""';
        case 'number': return '0';
        case 'boolean': return 'false';
        default: return 'new object()';
      }
    };
    const defaultArgs = spec.outputSchema.map(f => f.required ? getDefaultValue(f) : 'null').join(', ');

    return [
      'using Microsoft.AspNetCore.Mvc;',
      '',
      '[ApiController]',
      `public class ${opPascal}Controller : ControllerBase {`,
      `  ${methodAttr}`,
      `  public async Task<ActionResult<${res}>> ${opPascal}(${paramsStr}) {`,
      `    // TODO: implement logic`,
      `    return Ok(new ${res}(${defaultArgs}));`,
      `  }`,
      `}`
    ].join('\n');
  }
};
