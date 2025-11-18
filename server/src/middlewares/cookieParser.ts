import { NextFunction, Request, Response } from 'express';

type CookieMap = Record<string, string>;

const parseCookieHeader = (header: string): CookieMap => {
  return header.split(';').reduce<CookieMap>((acc, part) => {
    const [rawName, ...rawValueParts] = part.split('=');
    const name = rawName?.trim();
    if (!name) {
      return acc;
    }
    const rawValue = rawValueParts.join('=');
    const trimmed = rawValue.trim();
    try {
      acc[name] = trimmed ? decodeURIComponent(trimmed) : '';
    } catch {
      acc[name] = trimmed;
    }
    return acc;
  }, {});
};

export const cookieParser = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.cookie;
  if (!header) {
    req.cookies = {};
    next();
    return;
  }

  req.cookies = parseCookieHeader(header);
  next();
};
