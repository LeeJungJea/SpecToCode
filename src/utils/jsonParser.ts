export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const parseJsonText = (jsonText: string): ParseResult<unknown> => {
  try {
    return {
      ok: true,
      data: JSON.parse(jsonText)
    };
  } catch {
    return {
      ok: false,
      error: 'JSON 형식이 올바르지 않습니다.'
    };
  }
};

