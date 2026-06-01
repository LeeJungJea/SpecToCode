import type { SchemaField, SchemaValueType } from '../types/specToCode';

type SchemaBuildResult = { ok: true; schema: SchemaField[] } | { ok: false; error: string };
type FieldBuildResult = { ok: true; field: SchemaField } | { ok: false; error: string };

const TYPE_KEYWORDS: SchemaValueType[] = ['string', 'number', 'boolean', 'object', 'array', 'null', 'unknown'];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeTypeKeyword = (value: unknown): SchemaValueType | null => {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase() as SchemaValueType;
  return TYPE_KEYWORDS.includes(lowered) ? lowered : null;
};

const inferPrimitiveType = (value: unknown): SchemaValueType => {
  const keywordType = normalizeTypeKeyword(value);
  if (keywordType) return keywordType;
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
};

const isSchemaMetaObject = (value: Record<string, unknown>) => {
  return 'type' in value || 'required' in value || 'items' in value || 'properties' in value;
};

const getRequired = (value: Record<string, unknown>) => {
  return typeof value.required === 'boolean' ? value.required : false;
};

const buildField = (name: string, value: unknown): FieldBuildResult => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { ok: false, error: `${name} 배열은 최소 1개의 예시 값이 필요합니다.` };
    }

    const itemResult = buildField(`${name}Item`, value[0]);
    if (!itemResult.ok) return itemResult;

    return {
      ok: true,
      field: {
        name,
        type: 'array',
        required: false,
        arrayItem: itemResult.field
      }
    };
  }

  if (isPlainObject(value)) {
    if (isSchemaMetaObject(value)) {
      const required = getRequired(value);
      const explicitType = normalizeTypeKeyword(value.type);

      if (explicitType === 'array') {
        const itemValue = 'items' in value ? value.items : 'unknown';
        const itemResult = buildField(`${name}Item`, itemValue);
        if (!itemResult.ok) return itemResult;

        return {
          ok: true,
          field: {
            name,
            type: 'array',
            required,
            arrayItem: itemResult.field
          }
        };
      }

      if (explicitType === 'object' || isPlainObject(value.properties)) {
        const properties = isPlainObject(value.properties) ? value.properties : {};
        const childrenResult = buildSchemaFromJson(properties);
        if (!childrenResult.ok) return childrenResult;

        return {
          ok: true,
          field: {
            name,
            type: 'object',
            required,
            children: childrenResult.schema
          }
        };
      }

      return {
        ok: true,
        field: {
          name,
          type: explicitType || 'unknown',
          required
        }
      };
    }

    const childrenResult = buildSchemaFromJson(value);
    if (!childrenResult.ok) return childrenResult;

    return {
      ok: true,
      field: {
        name,
        type: 'object',
        required: false,
        children: childrenResult.schema
      }
    };
  }

  return {
    ok: true,
    field: {
      name,
      type: inferPrimitiveType(value),
      required: false
    }
  };
};

export const buildSchemaFromJson = (json: unknown): SchemaBuildResult => {
  if (!isPlainObject(json)) {
    return { ok: false, error: 'JSON 최상위 값은 객체여야 합니다.' };
  }

  const schema: SchemaField[] = [];

  for (const key of Object.keys(json)) {
    const fieldResult = buildField(key, json[key]);
    if (!fieldResult.ok) return fieldResult;
    schema.push(fieldResult.field);
  }

  return { ok: true, schema };
};
