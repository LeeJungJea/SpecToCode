import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getRequestTypeName, getResponseTypeName, getOperationNameFromUrl, toCamelCase, toPascalCase } from '../utils/naming';

const renderRules = (fields: SchemaField[]) => {
  if (!fields.length) return "return [];";
  const lines = fields.map((f) => `      '${f.name}' => '${f.required ? 'required' : 'nullable'}',`);
  return ['return [', ...lines, '    ];'].join('\n');
};

export const phpLaravelGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '// This API does not define a request body.';
    const name = getRequestTypeName(spec.url).replace(/Request$/, 'Request');
    return [
      `<?php`,
      `namespace App\Http\Requests;`,
      `use Illuminate\Foundation\Http\FormRequest;`,
      `class ${name} extends FormRequest {`,
      `    public function rules() {`,
      `    ${renderRules(spec.inputSchema)}`,
      `    }`,
      `}`
    ].join('\n');
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    const name = getResponseTypeName(spec.url).replace(/Response$/, 'Resource');
    const fields = spec.outputSchema.map(f => `            '${f.name}' => $this->${f.name},`).join('\n');
    const arrayReturn = spec.outputSchema.length > 0 
      ? `        return [\n${fields}\n        ];`
      : `        return [];`;
    return [
      `<?php`,
      `namespace App\\Http\\Resources;`,
      `use Illuminate\\Http\\Resources\\Json\\JsonResource;`,
      `class ${name} extends JsonResource {`,
      `    public function toArray($request) {`,
      arrayReturn,
      `    }`,
      `}`
    ].join('\n');
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const op = getOperationNameFromUrl(spec.url);
    const controller = `${toPascalCase(op)}Controller`;
    const hasBody = spec.method !== 'GET' && spec.method !== 'DELETE' && spec.inputSchema.length > 0 && spec.bodyType !== 'none';
    const requestClass = hasBody ? getRequestTypeName(spec.url) : 'Request';
    
    const methodArgs = [`${requestClass} $request`];
    spec.pathParamsSchema.forEach(f => {
      methodArgs.push(`$${toCamelCase(f.name)}`);
    });

    const lines: string[] = [];
    lines.push(`<?php`);
    lines.push(`// routes/api.php`);
    lines.push(`// Route::${spec.method.toLowerCase()}('${spec.url}', [\\App\\Http\\Controllers\\${controller}::class, '${op}']);`);
    lines.push(``);
    lines.push(`namespace App\\Http\\Controllers;`);
    if (hasBody) lines.push(`use App\\Http\\Requests\\${requestClass};`);
    lines.push(`use App\\Http\\Resources\\${getResponseTypeName(spec.url)};`);
    lines.push(`use Illuminate\\Http\\Request;`);
    lines.push(`class ${controller} extends Controller {`);
    lines.push(`    public function ${op}(${methodArgs.join(', ')}) {`);
    
    spec.headersSchema.forEach(f => {
      lines.push(`        $${toCamelCase(f.name.replace(/-/g, '_'))} = $request->header('${f.name}');`);
    });
    spec.queryParamsSchema.forEach(f => {
      lines.push(`        $${toCamelCase(f.name)} = $request->query('${f.name}');`);
    });
    
    lines.push(`        // TODO: implement logic`);
    lines.push(`        return new ${getResponseTypeName(spec.url)}([]);`);
    lines.push(`    }`);
    lines.push(`}`);
    
    return lines.join('\n');
  }
};
