import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getRequestTypeName, getResponseTypeName, getOperationNameFromUrl, toPascalCase } from '../utils/naming';

const mapType = (f: SchemaField) => {
  switch (f.type) {
    case 'string': return 'String'
    case 'number': return 'Long'
    case 'boolean': return 'Boolean'
    case 'array': return 'List<Any>'
    default: return 'Any'
  }
}

const renderDataClass = (name: string, fields: SchemaField[]) => {
  if (!fields.length) return `data class ${name}()`;
  const props = fields.map(f => `val ${f.name}: ${mapType(f)}${f.required ? '' : ' = null'}`).join(', ')
  return `data class ${name}(${props})`;
}

export const kotlinKtorGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '// This API does not define a request body.';
    return renderDataClass(getRequestTypeName(spec.url), spec.inputSchema);
  },
  generateResponseDto: (spec: ParsedApiSpec) => renderDataClass(getResponseTypeName(spec.url), spec.outputSchema),
  generateControllerMethod: (spec: ParsedApiSpec) => {
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';
    const lines = [
      `routing {`,
      `  ${spec.method.toLowerCase()}("${spec.url}") {`
    ];
    
    spec.pathParamsSchema.forEach(f => {
      lines.push(`    val ${f.name} = call.parameters["${f.name}"]`);
    });
    spec.headersSchema.forEach(f => {
      lines.push(`    val ${f.name.replace(/-/g, '_')} = call.request.header("${f.name}")`);
    });
    spec.queryParamsSchema.forEach(f => {
      lines.push(`    val ${f.name} = call.request.queryParameters["${f.name}"]`);
    });
    
    if (hasBody) {
      lines.push(`    val payload = call.receive<${getRequestTypeName(spec.url)}>()`);
    }
    
    const getDefaultValue = (f: SchemaField) => {
      switch (f.type) {
        case 'string': return '""';
        case 'number': return '0L';
        case 'boolean': return 'false';
        case 'array': return 'emptyList()';
        default: return 'Any()';
      }
    };
    
    const defaultArgs = spec.outputSchema
      .filter(f => f.required)
      .map(f => `${f.name} = ${getDefaultValue(f)}`)
      .join(', ');

    lines.push(`    // TODO: implement logic`);
    lines.push(`    call.respond(${getResponseTypeName(spec.url)}(${defaultArgs}))`);
    lines.push(`  }`);
    lines.push(`}`);
    return lines.join('\n');
  }
};
