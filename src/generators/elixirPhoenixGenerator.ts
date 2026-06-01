import type { ParsedApiSpec, SchemaField } from '../types/specToCode';
import { getOperationNameFromUrl, toPascalCase } from '../utils/naming';

const mapEctoType = (type: string) => {
  switch (type) {
    case 'string': return ':string';
    case 'number': return ':integer';
    case 'boolean': return ':boolean';
    case 'array': return '{:array, :map}';
    default: return ':map';
  }
};

export const elixirPhoenixGenerator = {
  generateRequestDto: (spec: ParsedApiSpec) => {
    if (spec.inputSchema.length === 0 || spec.method === 'GET' || spec.method === 'DELETE' || spec.bodyType === 'none') return '# This API does not define a request body.';
    const mod = `${toPascalCase(getOperationNameFromUrl(spec.url))}Request`;
    const fields = spec.inputSchema.map(f => `    field :${f.name}, ${mapEctoType(f.type)}`).join('\n');
    const fieldsList = spec.inputSchema.map(f => `:${f.name}`).join(', ');
    const requiredList = spec.inputSchema.filter(f => f.required).map(f => `:${f.name}`).join(', ');
    return [
      `defmodule MyApp.${mod} do`,
      `  use Ecto.Schema`,
      `  import Ecto.Changeset`,
      ``,
      `  @primary_key false`,
      `  embedded_schema do`,
      fields,
      `  end`,
      ``,
      `  def changeset(schema, attrs) do`,
      `    schema`,
      `    |> cast(attrs, [${fieldsList}])`,
      requiredList ? `    |> validate_required([${requiredList}])` : ``,
      `  end`,
      `end`
    ].filter(Boolean).join('\n');
  },

  generateResponseDto: (spec: ParsedApiSpec) => {
    if (spec.outputSchema.length === 0) return `# No response body schema`;
    const mod = `${toPascalCase(getOperationNameFromUrl(spec.url))}View`;
    const renderFields = spec.outputSchema.map(f => `      ${f.name}: data.${f.name}`).join(',\n');
    return [
      `defmodule MyAppWeb.${mod} do`,
      `  use MyAppWeb, :view`,
      ``,
      `  def render("index.json", %{data: data}) do`,
      `    %{`,
      renderFields,
      `    }`,
      `  end`,
      `end`
    ].join('\n');
  },

  generateControllerMethod: (spec: ParsedApiSpec) => {
    const op = getOperationNameFromUrl(spec.url);
    const mod = `${toPascalCase(op)}Controller`;
    const phoenixUrl = spec.url.replace(/\{([^}]+)\}/g, ':$1');
    const lines = [
      `# lib/my_app_web/router.ex`,
      `# ${spec.method.toLowerCase()} "${phoenixUrl}", ${mod}, :${op}`,
      ``,
      `defmodule MyAppWeb.${mod} do`,
      `  use MyAppWeb, :controller`,
      ``,
      `  def ${op}(conn, params) do`
    ];
    
    const mapExtracts: string[] = [];
    spec.pathParamsSchema.forEach(f => mapExtracts.push(`"${f.name}" => ${f.name.replace(/-/g, '_')}`));
    spec.queryParamsSchema.filter(f => f.required).forEach(f => mapExtracts.push(`"${f.name}" => ${f.name.replace(/-/g, '_')}`));
    
    if (mapExtracts.length > 0) {
      lines.push(`    %{${mapExtracts.join(', ')}} = params`);
    }

    spec.queryParamsSchema.filter(f => !f.required).forEach(f => {
      lines.push(`    ${f.name.replace(/-/g, '_')} = Map.get(params, "${f.name}")`);
    });
    
    spec.headersSchema.forEach(f => {
      lines.push(`    ${f.name.replace(/-/g, '_').toLowerCase()} = get_req_header(conn, "${f.name.toLowerCase()}") |> List.first()`);
    });
    
    lines.push(`    # TODO: implement logic`);
    lines.push(`    json(conn, %{})`);
    lines.push(`  end`);
    lines.push(`end`);
    return lines.join('\n');
  }
};
