import type { ParsedApiSpec } from '../types/specToCode';
import { generateRequestTypes, generateResponseTypes } from './frontendUtils';
import { getRequestTypeName, getResponseTypeName, getOperationNameFromUrl } from '../utils/naming';

export const nodeTypeScriptGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '// This API does not define a request body.';
    return generateRequestTypes(spec, getRequestTypeName(spec.url));
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    return generateResponseTypes(spec, getResponseTypeName(spec.url));
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const requestName = getRequestTypeName(spec.url);
    const responseName = getResponseTypeName(spec.url);
    const operationName = getOperationNameFromUrl(spec.url);
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.bodyType !== 'none' && spec.inputSchema.length > 0;
    const lines: string[] = [];
    lines.push(`import express from 'express';`);
    lines.push(`const router = express.Router();`);
    lines.push('');
    lines.push(`// Types (replace with generated types above)\n`);
    const expressUrl = spec.url.replace(/\{([^}]+)\}/g, ':$1');
    lines.push(`router.${spec.method.toLowerCase()}('${expressUrl}', async (req, res) => {`);
    if (hasBody) lines.push(`  const payload: ${requestName} = req.body;`);
    
    spec.pathParamsSchema.forEach(field => {
      lines.push(`  const ${field.name} = req.params.${field.name};`);
    });
    spec.headersSchema.forEach(field => {
      lines.push(`  const ${field.name.replace(/-/g, '_')} = req.headers['${field.name.toLowerCase()}'];`);
    });
    spec.queryParamsSchema.forEach(field => {
      lines.push(`  const ${field.name} = req.query.${field.name};`);
    });
    
    lines.push('  // TODO: implement business logic');
    lines.push(`  const result: ${responseName} = {} as any;`);
    lines.push('  res.json(result);');
    lines.push('});');
    lines.push('');
    lines.push('export default router;');
    return lines.join('\n');
  }
};
