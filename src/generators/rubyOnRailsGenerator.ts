import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getOperationNameFromUrl, getRequestTypeName, getResponseTypeName, toPascalCase } from '../utils/naming';

const permitList = (fields: SchemaField[]) => fields.map((f) => `'${f.name}'`).join(', ');

export const rubyOnRailsGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '# This API does not define a request body.';
    const op = getOperationNameFromUrl(spec.url);
    const method = `${op}_params`;
    const fields = permitList(spec.inputSchema);
    return [
      `# In your controller (usually at the bottom in private section):`,
      `private`,
      ``,
      `def ${method}`,
      `  params.permit(${fields})`,
      `end`
    ].join('\n');
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    if (spec.outputSchema.length === 0) return `# No response body parameters`;
    const op = getOperationNameFromUrl(spec.url);
    const fields = spec.outputSchema.map(f => `json.${f.name} @${op}.${f.name}`).join('\n');
    return [
      `# app/views/${op.toLowerCase()}/index.json.jbuilder`,
      fields
    ].join('\n');
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const op = getOperationNameFromUrl(spec.url);
    const ctrl = `${toPascalCase(op)}Controller`;
    const railsUrl = spec.url.replace(/\{([^}]+)\}/g, ':$1');
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';
    const lines: string[] = [];
    
    lines.push(`# config/routes.rb`);
    lines.push(`# ${spec.method.toLowerCase()} '${railsUrl}', to: '${op.toLowerCase()}#${op}'`);
    lines.push(``);
    lines.push(`class ${ctrl} < ApplicationController`);
    lines.push(`  def ${op}`);
    
    spec.pathParamsSchema.forEach(f => {
      lines.push(`    ${f.name.replace(/-/g, '_')} = params[:${f.name}]`);
    });
    spec.headersSchema.forEach(f => {
      lines.push(`    ${f.name.replace(/-/g, '_').toLowerCase()} = request.headers['${f.name}']`);
    });
    spec.queryParamsSchema.forEach(f => {
      lines.push(`    ${f.name.replace(/-/g, '_')} = params[:${f.name}]`);
    });
    
    if (hasBody) {
      lines.push(`    permitted = params.permit(${permitList(spec.inputSchema)})`);
    }
    
    lines.push(`    # TODO: implement business logic`);
    lines.push(`    render json: {}`);
    lines.push(`  end`);
    lines.push(`end`);
    return lines.join('\n');
  }
};
