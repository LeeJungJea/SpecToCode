import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { toPascalCase } from '../utils/naming';

export const isIdentifier = (value: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);

export const renderTsPropertyName = (field: SchemaField) => {
  const name = isIdentifier(field.name) ? field.name : JSON.stringify(field.name);
  return `${name}${field.required ? '' : '?'}`;
};

export const renderAccess = (objectName: string, field: SchemaField) => {
  return isIdentifier(field.name) ? `${objectName}.${field.name}` : `${objectName}[${JSON.stringify(field.name)}]`;
};

export const getTsFieldType = (field: SchemaField, parentName: string): string => {
  if (field.type === 'array') {
    if (!field.arrayItem) return 'unknown[]';
    return `${getTsFieldType(field.arrayItem, `${parentName}${toPascalCase(field.name)}Item`)}[]`;
  }
  if (field.type === 'object') return `${parentName}${toPascalCase(field.name)}`;
  if (field.type === 'null') return 'null';
  if (field.type === 'unknown') return 'unknown';
  return field.type;
};

export const renderInterface = (interfaceName: string, fields: SchemaField[]) => {
  if (!fields || fields.length === 0) return `export interface ${interfaceName} {}`;
  const lines = [`export interface ${interfaceName} {`];
  fields.forEach((field) => {
    lines.push(`  ${renderTsPropertyName(field)}: ${getTsFieldType(field, interfaceName)};`);
  });
  lines.push('}');
  return lines.join('\n');
};

export const collectInterfaces = (interfaceName: string, fields: SchemaField[], result: string[]) => {
  fields.forEach((field) => {
    if (field.type === 'object' && field.children) {
      const nestedName = `${interfaceName}${toPascalCase(field.name)}`;
      result.push(renderInterface(nestedName, field.children));
      collectInterfaces(nestedName, field.children, result);
    }
    if (field.type === 'array' && field.arrayItem?.type === 'object') {
      const nestedName = `${interfaceName}${toPascalCase(field.name)}Item`;
      const children = field.arrayItem.children || [];
      result.push(renderInterface(nestedName, children));
      collectInterfaces(nestedName, children, result);
    }
  });
};

export const generateInterfacesForSchema = (interfaceName: string, fields: SchemaField[]) => {
  if (!fields || fields.length === 0) return '';
  const interfaces = [renderInterface(interfaceName, fields)];
  collectInterfaces(interfaceName, fields, interfaces);
  return interfaces.join('\n\n');
};

export const hasFields = (fields: SchemaField[]) => fields && fields.length > 0;

export const renderHeaderObject = (spec: ParsedApiSpec) => {
  const isFormData = spec.bodyType === 'form-data';
  const isUrlEncoded = spec.bodyType === 'x-www-form-urlencoded';
  const isJson = spec.bodyType === 'json';
  const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE';
  
  const defaultContentType = isUrlEncoded ? `'Content-Type': 'application/x-www-form-urlencoded',` :
                             isJson ? `'Content-Type': 'application/json',` : null;

  const headerLines = [];
  if (defaultContentType && !isFormData && hasBody) {
    headerLines.push(`      ${defaultContentType}`);
  }

  if (hasFields(spec.headersSchema)) {
    spec.headersSchema.forEach((field) => {
      const accessStr = isIdentifier(field.name) ? `headers?.${field.name}` : `headers?.['${field.name}']`;
      if (field.required) {
        headerLines.push(`      '${field.name}': String(${accessStr}),`);
      } else {
        headerLines.push(`      ...(${accessStr} !== undefined ? { '${field.name}': String(${accessStr}) } : {}),`);
      }
    });
  }

  return headerLines.join('\n');
};

export const renderBodyLines = (spec: ParsedApiSpec) => {
  const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
  if (!hasBody) return [];

  if (spec.bodyType === 'form-data') {
    return [
      `  const formData = new FormData();`,
      ...spec.inputSchema.map((field) => {
        const value = renderAccess('payload', field);
        if (field.required) return `  formData.append('${field.name}', String(${value}));`;
        return `  if (${value} !== undefined) formData.append('${field.name}', String(${value}));`;
      }),
      ``
    ];
  }

  if (spec.bodyType === 'x-www-form-urlencoded') {
    return [
      `  const formData = new URLSearchParams();`,
      ...spec.inputSchema.map((field) => {
        const value = renderAccess('payload', field);
        if (field.required) return `  formData.append('${field.name}', String(${value}));`;
        return `  if (${value} !== undefined) formData.append('${field.name}', String(${value}));`;
      }),
      ``
    ];
  }

  return [];
};

export const renderBodyOption = (spec: ParsedApiSpec) => {
  const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && hasFields(spec.inputSchema) && spec.bodyType !== 'none';
  if (!hasBody) return '';
  if (spec.bodyType === 'form-data') return `    body: formData,`;
  if (spec.bodyType === 'x-www-form-urlencoded') return `    body: formData,`;
  if (spec.bodyType === 'raw') return `    body: payload,`;
  if (spec.bodyType === 'binary') return `    body: payload,`;
  return `    body: JSON.stringify(payload),`;
};

export const buildUrlExpression = (spec: ParsedApiSpec) => {
  let url = spec.url.replace(/\{([^}]+)\}/g, (match, paramName) => {
    return `\${pathParams.${paramName}}`;
  });

  const templateUrl = url.includes('${') ? '`' + url + '`' : `'${url}'`;

  if (!hasFields(spec.queryParamsSchema)) return templateUrl;

  return [
    `(() => {`,
    `    const url = new URL(${templateUrl}, window.location.origin);`,
    ...spec.queryParamsSchema.map((field) => {
      const value = renderAccess('queryParams', field);
      if (field.required) return `    url.searchParams.set('${field.name}', String(${value}));`;
      return `    if (queryParams && ${value} !== undefined) url.searchParams.set('${field.name}', String(${value}));`;
    }),
    `    return url.pathname + url.search;`,
    `  })()`
  ].join('\n  ');
};

export const renderResponseParsing = (spec: ParsedApiSpec, awaitKeyword = 'await ') => {
  if (spec.responseType === 'text') return `${awaitKeyword}response.text()`;
  if (spec.responseType === 'blob') return `${awaitKeyword}response.blob()`;
  if (spec.responseType === 'arrayBuffer') return `${awaitKeyword}response.arrayBuffer()`;
  return `${awaitKeyword}response.json()`;
};

export const generateRequestTypes = (spec: ParsedApiSpec, requestName: string) => {
  const chunks = [
    hasFields(spec.headersSchema) ? generateInterfacesForSchema(`${requestName}Headers`, spec.headersSchema) : '',
    hasFields(spec.queryParamsSchema) ? generateInterfacesForSchema(`${requestName}QueryParams`, spec.queryParamsSchema) : '',
    hasFields(spec.pathParamsSchema) ? generateInterfacesForSchema(`${requestName}PathParams`, spec.pathParamsSchema) : '',
    hasFields(spec.inputSchema) ? generateInterfacesForSchema(requestName, spec.inputSchema) : ''
  ];
  return chunks.filter(Boolean).join('\n\n');
};

export const generateResponseTypes = (spec: ParsedApiSpec, responseName: string) => {
  const chunks = [
    hasFields(spec.outputSchema) ? generateInterfacesForSchema(responseName, spec.outputSchema) : ''
  ];
  return chunks.filter(Boolean).join('\n\n');
};

export const generateCommonTypes = (spec: ParsedApiSpec, requestName: string, responseName: string) => {
  const req = generateRequestTypes(spec, requestName);
  const res = generateResponseTypes(spec, responseName);
  return [req, res].filter(Boolean).join('\n\n');
};
