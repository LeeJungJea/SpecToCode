export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type FrontendLanguage =
  | 'REACT_TYPESCRIPT'
  | 'VUE_3'
  | 'ANGULAR'
  | 'SVELTE'
  | 'NEXT_JS'
  | 'NUXT_JS'
  | 'SOLID_JS'
  | 'PREACT'
  | 'VANILLA_TYPESCRIPT'
  | 'VANILLA_JAVASCRIPT';

export type BackendLanguage =
  | 'JAVA_SPRING_BOOT'
  | 'NODE_TYPESCRIPT'
  | 'PYTHON_FASTAPI'
  | 'GO_GIN'
  | 'CSHARP_DOTNET'
  | 'PHP_LARAVEL'
  | 'RUBY_ON_RAILS'
  | 'KOTLIN_KTOR'
  | 'RUST_ACTIX'
  | 'ELIXIR_PHOENIX';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';

export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer';

export type SchemaValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'unknown';

export interface ApiSpecInput {
  method: HttpMethod;
  url: string;
  bodyType: BodyType;
  headersJsonText: string;
  queryParamsJsonText: string;
  pathParamsJsonText: string;
  bodyJsonText: string;
  responseJsonText: string;
  responseType: ResponseType;
  frontendLanguage: FrontendLanguage;
  backendLanguage: BackendLanguage;
}

export interface SchemaField {
  name: string;
  type: SchemaValueType;
  required: boolean;
  children?: SchemaField[];
  arrayItem?: SchemaField;
}

export interface ParsedApiSpec {
  method: HttpMethod;
  url: string;
  bodyType: BodyType;
  headersSchema: SchemaField[];
  queryParamsSchema: SchemaField[];
  pathParamsSchema: SchemaField[];
  inputSchema: SchemaField[];
  outputSchema: SchemaField[];
  responseType: ResponseType;
}

export interface SpecInputErrors {
  url?: string;
  headersJson?: string;
  queryParamsJson?: string;
  pathParamsJson?: string;
  bodyJson?: string;
  responseJson?: string;
}

export interface GeneratedCodeResult {
  frontend: {
    types: string;
    fetchFunction: string;
  };
  backend: {
    requestDto: string;
    responseDto: string;
    controllerMethod: string;
  };
}
