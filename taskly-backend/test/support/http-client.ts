export interface ClientResponse {
  status: number;
  headers: Headers;
  body: any;
  setCookie: string[];
}

export interface RequestOptions {
  json?: unknown;
  form?: FormData | string;
  headers?: Record<string, string>;
}

const parseSetCookie = (header: string) => {
  const [pair, ...attributes] = header.split(';');
  const separator = pair.indexOf('=');
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  const expired = attributes.some((attribute) => {
    const [key, rawValue] = attribute.split('=');
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey === 'max-age') {
      return Number.parseInt(rawValue, 10) <= 0;
    }
    if (normalizedKey === 'expires') {
      return Date.parse(rawValue) < Date.now();
    }
    return false;
  });
  return { name, value, expired };
};

export const createHttpClient = (baseUrl: string) => {
  const cookies = new Map<string, string>();

  const request = async (
    method: string,
    path: string,
    { json, form, headers = {} }: RequestOptions = {},
  ): Promise<ClientResponse> => {
    const requestHeaders: Record<string, string> = { ...headers };
    let body: BodyInit | undefined;

    if (cookies.size > 0) {
      requestHeaders.cookie = [...cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    }
    if (json !== undefined) {
      requestHeaders['content-type'] = 'application/json';
      body = JSON.stringify(json);
    }
    if (form) {
      body = form;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body,
    });
    const setCookie = response.headers.getSetCookie();

    for (const header of setCookie) {
      const { name, value, expired } = parseSetCookie(header);
      if (!value || expired) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }

    const text = await response.text();
    let parsed: any = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    return {
      status: response.status,
      headers: response.headers,
      body: parsed,
      setCookie,
    };
  };

  return {
    get: (path: string, options?: RequestOptions) =>
      request('GET', path, options),
    post: (path: string, options?: RequestOptions) =>
      request('POST', path, options),
    patch: (path: string, options?: RequestOptions) =>
      request('PATCH', path, options),
    delete: (path: string, options?: RequestOptions) =>
      request('DELETE', path, options),
    hasCookie: (name: string) => cookies.has(name),
    clearCookies: () => cookies.clear(),
  };
};

export type HttpClient = ReturnType<typeof createHttpClient>;

export interface ImageFormOptions {
  fieldName?: string;
  filename?: string;
  type?: string;
  size?: number;
}

export const createImageForm = ({
  fieldName = 'avatar',
  filename = 'avatar.png',
  type = 'image/png',
  size = 128,
}: ImageFormOptions = {}): FormData => {
  const form = new FormData();
  form.append(fieldName, new Blob([Buffer.alloc(size, 1)], { type }), filename);
  return form;
};
