import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { capitalize, getOperationNameFromUrl, getRequestTypeName, getResponseTypeName, toCamelCase, toPascalCase } from '../utils/naming';

const JAVA_TYPE_MAP: Record<string, string> = {
  string: 'String',
  number: 'Long',
  boolean: 'Boolean',
  null: 'Object',
  unknown: 'Object'
};

const hasFields = (fields: SchemaField[]) => fields.length > 0;

const getJavaType = (field: SchemaField, parentName: string): string => {
  if (field.type === 'array') {
    if (!field.arrayItem) return 'List<Object>';
    return `List<${getJavaType(field.arrayItem, `${parentName}${toPascalCase(field.name)}Item`)}>`;
  }

  if (field.type === 'object') return `${parentName}${toPascalCase(field.name)}`;
  return JAVA_TYPE_MAP[field.type] || 'Object';
};

const hasListField = (fields: SchemaField[]): boolean => {
  return fields.some((field) => {
    if (field.type === 'array') return true;
    if (field.children && hasListField(field.children)) return true;
    if (field.arrayItem?.children && hasListField(field.arrayItem.children)) return true;
    return false;
  });
};

const renderFields = (className: string, fields: SchemaField[], level: number) => {
  const pad = '    '.repeat(level);
  return fields.map((field) => `${pad}private ${getJavaType(field, className)} ${field.name};`);
};

const renderAccessors = (className: string, fields: SchemaField[], level: number) => {
  const lines: string[] = [];
  const pad = '    '.repeat(level);

  fields.forEach((field) => {
    const javaType = getJavaType(field, className);
    const methodSuffix = capitalize(field.name);
    lines.push(
      `${pad}public ${javaType} get${methodSuffix}() {`,
      `${pad}    return ${field.name};`,
      `${pad}}`,
      ``,
      `${pad}public void set${methodSuffix}(${javaType} ${field.name}) {`,
      `${pad}    this.${field.name} = ${field.name};`,
      `${pad}}`
    );
  });

  return lines;
};

const collectNestedClasses = (className: string, fields: SchemaField[], level: number, result: string[]) => {
  fields.forEach((field) => {
    if (field.type === 'object' && field.children) {
      const nestedName = `${className}${toPascalCase(field.name)}`;
      result.push(renderClass(nestedName, field.children, level, true));
    }

    if (field.type === 'array' && field.arrayItem?.type === 'object') {
      const nestedName = `${className}${toPascalCase(field.name)}Item`;
      result.push(renderClass(nestedName, field.arrayItem.children || [], level, true));
    }
  });
};

const renderClass = (className: string, fields: SchemaField[], level: number, isStatic: boolean) => {
  const pad = '    '.repeat(level);
  const lines = [`${pad}public ${isStatic ? 'static ' : ''}class ${className} {`];
  const fieldLines = renderFields(className, fields, level + 1);
  const accessorLines = renderAccessors(className, fields, level + 1);
  const nestedClasses: string[] = [];
  collectNestedClasses(className, fields, level + 1, nestedClasses);

  if (fieldLines.length > 0) lines.push(...fieldLines, '');
  if (accessorLines.length > 0) lines.push(...accessorLines);
  if (nestedClasses.length > 0) lines.push('', ...nestedClasses);
  lines.push(`${pad}}`);
  return lines.join('\n');
};

const generateDto = (className: string, fields: SchemaField[]) => {
  const imports = hasListField(fields) ? 'import java.util.List;\n\n' : '';
  return `${imports}${renderClass(className, fields, 0, false)}`;
};

const renderControllerParameter = (annotation: string, field: SchemaField) => {
  if (annotation === '@PathVariable') {
    return `${annotation}("${field.name}") ${getJavaType(field, 'Param')} ${toCamelCase(field.name)}`;
  }
  const requiredOption = field.required ? `value = "${field.name}"` : `value = "${field.name}", required = false`;
  return `${annotation}(${requiredOption}) ${getJavaType(field, 'Param')} ${toCamelCase(field.name)}`;
};

export const javaSpringBootGenerator = {
  generateRequestDto(spec: ParsedApiSpec) {
    if (!hasFields(spec.inputSchema) || spec.bodyType === 'none') return '// This API does not define a request body.';
    return generateDto(getRequestTypeName(spec.url), spec.inputSchema);
  },

  generateResponseDto(spec: ParsedApiSpec) {
    return generateDto(getResponseTypeName(spec.url), spec.outputSchema);
  },

  generateControllerMethod(spec: ParsedApiSpec) {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const operationName = getOperationNameFromUrl(spec.url);
    const methodAnnotation = `${capitalize(spec.method.toLowerCase())}Mapping`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
    const bodyParameters =
      hasBody && (spec.bodyType === 'form-data' || spec.bodyType === 'x-www-form-urlencoded')
        ? spec.inputSchema.map((field) => renderControllerParameter('@RequestParam', field))
        : [hasBody ? `@RequestBody ${requestName} request` : ''];
    const parameters = [
      ...spec.headersSchema.map((field) => renderControllerParameter('@RequestHeader', field)),
      ...spec.queryParamsSchema.map((field) => renderControllerParameter('@RequestParam', field)),
      ...spec.pathParamsSchema.map((field) => renderControllerParameter('@PathVariable', field)),
      ...bodyParameters
    ].filter(Boolean);

    return [
      `@RestController`,
      `public class ${toPascalCase(operationName)}Controller {`,
      ``,
      `    @${methodAnnotation}("${spec.url}")`,
      `    public ${responseName} ${operationName}(${parameters.join(', ')}) {`,
      `        ${responseName} response = new ${responseName}();`,
      `        return response;`,
      `    }`,
      `}`
    ].join('\n');
  }
};
