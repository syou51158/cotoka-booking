export const isDev = process.env.NODE_ENV !== "production";

export const allowMocks =
  isDev &&
  process.env.ALLOW_DEV_MOCKS === "true" &&
  process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true";

export const mockRequested = (req: Request) => {
  const u = new URL(req.url);
  return (
    u.searchParams.get("mock") === "1" ||
    u.searchParams.get("source") === "mock"
  );
};

export const withDataSource = (res: Response, source: "db" | "mock") => {
  res.headers.set("X-Data-Source", source);
  return res;
};
