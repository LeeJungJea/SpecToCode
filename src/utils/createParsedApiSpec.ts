import type { ApiSpecInput, ParsedApiSpec, SpecInputErrors } from '../types/specToCode';
import { parseJsonText } from './jsonParser';
import { buildSchemaFromJson } from './schemaBuilder';

type CreateParsedSpecResult = { ok: true; spec: ParsedApiSpec } | { ok: false; errors: SpecInputErrors };

const isEmptyObject = (value: unknown) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
};

export const createParsedApiSpec = (input: ApiSpecInput): CreateParsedSpecResult => {
  const errors: SpecInputErrors = {};

  if (!input.url.trim()) {
    errors.url = 'API URL을 입력해주세요.';
  }

  const headersParseResult = parseJsonText(input.headersJsonText);
  if (!headersParseResult.ok) errors.headersJson = headersParseResult.error;

  const queryParamsParseResult = parseJsonText(input.queryParamsJsonText);
  if (!queryParamsParseResult.ok) errors.queryParamsJson = queryParamsParseResult.error;

  const pathParamsParseResult = parseJsonText(input.pathParamsJsonText);
  if (!pathParamsParseResult.ok) errors.pathParamsJson = pathParamsParseResult.error;

  const bodyParseResult = parseJsonText(input.bodyJsonText);
  if (!bodyParseResult.ok) errors.bodyJson = bodyParseResult.error;

  const responseParseResult = parseJsonText(input.responseJsonText);
  if (!responseParseResult.ok) errors.responseJson = responseParseResult.error;
  if (responseParseResult.ok && isEmptyObject(responseParseResult.data)) {
    errors.responseJson = 'Response는 최소 1개 이상의 필드가 필요합니다.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (
    !headersParseResult.ok ||
    !queryParamsParseResult.ok ||
    !pathParamsParseResult.ok ||
    !bodyParseResult.ok ||
    !responseParseResult.ok
  ) {
    return { ok: false, errors };
  }

  const headersSchemaResult = buildSchemaFromJson(headersParseResult.data);
  if (!headersSchemaResult.ok) errors.headersJson = headersSchemaResult.error;

  const queryParamsSchemaResult = buildSchemaFromJson(queryParamsParseResult.data);
  if (!queryParamsSchemaResult.ok) errors.queryParamsJson = queryParamsSchemaResult.error;

  const pathParamsSchemaResult = buildSchemaFromJson(pathParamsParseResult.data);
  if (!pathParamsSchemaResult.ok) errors.pathParamsJson = pathParamsSchemaResult.error;

  const bodySchemaResult = buildSchemaFromJson(bodyParseResult.data);
  if (!bodySchemaResult.ok) errors.bodyJson = bodySchemaResult.error;

  const responseSchemaResult = buildSchemaFromJson(responseParseResult.data);
  if (!responseSchemaResult.ok) errors.responseJson = responseSchemaResult.error;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (
    !headersSchemaResult.ok ||
    !queryParamsSchemaResult.ok ||
    !pathParamsSchemaResult.ok ||
    !bodySchemaResult.ok ||
    !responseSchemaResult.ok
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    spec: {
      method: input.method,
      url: input.url.trim(),
      bodyType: input.bodyType,
      headersSchema: headersSchemaResult.schema,
      queryParamsSchema: queryParamsSchemaResult.schema,
      pathParamsSchema: pathParamsSchemaResult.schema,
      inputSchema: bodySchemaResult.schema,
      outputSchema: responseSchemaResult.schema,
      responseType: input.responseType
    }
  };
};
