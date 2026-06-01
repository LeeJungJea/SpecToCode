import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getRequestTypeName, getResponseTypeName, getOperationNameFromUrl, toPascalCase } from '../utils/naming';

const mapType = (f: SchemaField) => {
  switch (f.type) {
    case 'string': return 'String'
    case 'number': return 'i64'
    case 'boolean': return 'bool'
    case 'array': return 'Vec<serde_json::Value>'
    default: return 'serde_json::Value'
  }
}

const toSnakeCase = (str: string) => {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "").replace(/-/g, '_');
};

const renderStruct = (name: string, fields: SchemaField[]) => {
  const lines = [
    `#[derive(Serialize, Deserialize)]`,
    `#[serde(rename_all = "camelCase")]`,
    `pub struct ${name} {`
  ];
  fields.forEach(f => {
    const t = mapType(f);
    const typeStr = f.required ? t : `Option<${t}>`;
    lines.push(`  pub ${toSnakeCase(f.name)}: ${typeStr},`);
  });
  lines.push('}');
  return lines.join('\n');
}

export const rustActixGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '// This API does not define a request body.';
    return renderStruct(toPascalCase(getRequestTypeName(spec.url)), spec.inputSchema);
  },
  generateResponseDto: (spec: ParsedApiSpec) => renderStruct(toPascalCase(getResponseTypeName(spec.url)), spec.outputSchema),
  generateControllerMethod: (spec: ParsedApiSpec) => {
    const op = getOperationNameFromUrl(spec.url);
    const req = toPascalCase(getRequestTypeName(spec.url));
    const resp = toPascalCase(getResponseTypeName(spec.url));
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';
    
    const args: string[] = [];
    if (spec.pathParamsSchema.length > 0) {
      const types = spec.pathParamsSchema.map(f => mapType(f)).join(', ');
      args.push(`path: web::Path<${spec.pathParamsSchema.length > 1 ? `(${types})` : types}>`);
    }
    if (spec.headersSchema.length > 0) {
      args.push(`req: HttpRequest`);
    }
    if (spec.queryParamsSchema.length > 0) {
      args.push(`query: web::Query<HashMap<String, String>>`);
    }
    if (hasBody) args.push(`payload: web::Json<${req}>`);
    
    const lines = [
      `use actix_web::{${spec.method.toLowerCase()}, web, HttpRequest, HttpResponse};`,
      `use std::collections::HashMap;`,
      ``,
      `#[${spec.method.toLowerCase()}("${spec.url}")]`,
      `async fn ${op}(${args.join(', ')}) -> HttpResponse {`
    ];

    if (spec.pathParamsSchema.length > 0) {
      if (spec.pathParamsSchema.length === 1) {
        lines.push(`    let ${spec.pathParamsSchema[0].name.replace(/-/g, '_')} = path.into_inner();`);
      } else {
        const names = spec.pathParamsSchema.map(f => f.name.replace(/-/g, '_')).join(', ');
        lines.push(`    let (${names}) = path.into_inner();`);
      }
    }
    
    spec.headersSchema.forEach(f => {
      lines.push(`    let ${f.name.replace(/-/g, '_').toLowerCase()} = req.headers().get("${f.name}");`);
    });
    
    if (spec.queryParamsSchema.length > 0) {
      spec.queryParamsSchema.forEach(f => {
        lines.push(`    let ${toSnakeCase(f.name)} = query.get("${f.name}");`);
      });
    }

    const getDefaultValue = (f: SchemaField) => {
      switch (f.type) {
        case 'string': return 'String::new()';
        case 'number': return '0';
        case 'boolean': return 'false';
        default: return 'serde_json::Value::Null';
      }
    };

    lines.push('    // TODO: implement logic');
    if (spec.outputSchema.length === 0) {
      lines.push(`    HttpResponse::Ok().json(${resp} {})`);
    } else {
      lines.push(`    HttpResponse::Ok().json(${resp} {`);
      spec.outputSchema.forEach(f => {
        const val = f.required ? getDefaultValue(f) : 'None';
        lines.push(`        ${toSnakeCase(f.name)}: ${val},`);
      });
      lines.push(`    })`);
    }
    lines.push('}');
    return lines.join('\n');
  }
};
