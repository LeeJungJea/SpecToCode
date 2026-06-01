import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getRequestTypeName, getResponseTypeName, toPascalCase, getOperationNameFromUrl } from '../utils/naming';

const mapType = (field: SchemaField): string => {
  switch (field.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'int64';
    case 'boolean':
      return 'bool';
    case 'array':
      if (!field.arrayItem) return '[]interface{}';
      return `[]${mapType(field.arrayItem)}`;
    case 'object':
      return toPascalCase(field.name);
    default:
      return 'interface{}';
  }
};

const renderStruct = (structName: string, fields: SchemaField[]): string => {
  const lines: string[] = [];
  lines.push(`type ${structName} struct {`);
  fields.forEach((f) => {
    const goType = mapType(f);
    const fieldName = toPascalCase(f.name) || 'Field';
    lines.push(`    ${fieldName} ${goType} \`json:"${f.name}"\``);
  });
  lines.push('}');
  return lines.join('\n');
};

export const goGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '// This API does not define a request body.';
    const name = getRequestTypeName(spec.url);
    return renderStruct(name, spec.inputSchema);
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    const name = getResponseTypeName(spec.url);
    return renderStruct(name, spec.outputSchema);
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const op = getOperationNameFromUrl(spec.url);
    const reqName = getRequestTypeName(spec.url);
    const respName = getResponseTypeName(spec.url);
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';
    const lines: string[] = [];
    
    const ginUrl = spec.url.replace(/\{([^}]+)\}/g, ':$1');
    lines.push(`// Router registration:`);
    lines.push(`// r.${spec.method.toUpperCase()}("${ginUrl}", ${toPascalCase(op)})`);
    lines.push(``);
    lines.push(`func ${toPascalCase(op)}(c *gin.Context) {`);
    
    spec.pathParamsSchema.forEach(f => {
      lines.push(`    ${f.name} := c.Param("${f.name}")`);
    });
    spec.headersSchema.forEach(f => {
      lines.push(`    ${f.name.replace(/-/g, '_')} := c.GetHeader("${f.name}")`);
    });
    spec.queryParamsSchema.forEach(f => {
      lines.push(`    ${f.name} := c.Query("${f.name}")`);
    });
    
    if (hasBody) {
      lines.push(`    var req ${reqName}`);
      lines.push(`    if err := c.BindJSON(&req); err != nil {`);
      lines.push(`        c.JSON(400, gin.H{"error": err.Error()})`);
      lines.push('        return');
      lines.push('    }');
    }
    
    lines.push('    var resp ' + respName);
    lines.push('    c.JSON(200, resp)');
    lines.push('}');
    return lines.join('\n');
  }
};
