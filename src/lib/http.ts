export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  Response.json(data, typeof init === "number" ? { status: init } : init);

export const assertEnv = (keys: string[]) => {
  const missing = keys.filter((k) => !process.env[k] || process.env[k] === "");
  if (missing.length) {
    throw new HttpError(503, `MISSING_ENV:${missing.join(',')}`);
  }
};