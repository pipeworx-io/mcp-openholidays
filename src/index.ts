interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OpenHolidays MCP.
 *
 * Public AND school holidays for ~30 European countries, with regional
 * subdivisions, from openholidaysapi.org. Keyless. Complements the
 * worldwide-public-only `nager-holidays` pack: OpenHolidays is Europe-focused
 * but adds *school* holidays (term breaks) and per-subdivision granularity,
 * which nager does not provide.
 */


const BASE = 'https://openholidaysapi.org';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

type LocalizedText = { language?: string; text?: string };

/** Extract the {language,text} entry for `lang` (fallback: first), as a plain string. */
function localName(arr: unknown, lang = 'EN'): string | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const list = arr as LocalizedText[];
  const match = list.find((n) => (n?.language ?? '').toUpperCase() === lang.toUpperCase());
  return (match ?? list[0])?.text ?? null;
}

/** Map a raw Public/School holiday record into the flat pack shape. */
function mapHoliday(raw: Record<string, unknown>, lang: string) {
  const subs = Array.isArray(raw.subdivisions) ? (raw.subdivisions as Array<Record<string, unknown>>) : [];
  return {
    name: localName(raw.name, lang),
    start_date: raw.startDate ?? null,
    end_date: raw.endDate ?? null,
    nationwide: raw.nationwide ?? null,
    subdivisions: subs.map((s) => s.shortName ?? s.code).filter((v) => v != null),
  };
}

const tools: McpToolExport['tools'] = [
  {
    name: 'public_holidays',
    description:
      'Public (statutory) holidays for a European country in a date range, with regional subdivisions. EUROPE-focused (~30 countries: DE, FR, NL, CH, IT, AT, BE, ES, PL, etc.). Returns each holiday with its localized name, dates, whether it is nationwide, and which subdivisions observe it. Keyless. For school terms/breaks use school_holidays instead.',
    inputSchema: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code, e.g. "DE", "FR", "NL", "CH", "IT".',
        },
        valid_from: { type: 'string', description: 'Start of date range, YYYY-MM-DD.' },
        valid_to: { type: 'string', description: 'End of date range, YYYY-MM-DD.' },
        language: { type: 'string', description: 'Language for names, ISO 639-1 (default "EN").' },
      },
      required: ['country', 'valid_from', 'valid_to'],
    },
  },
  {
    name: 'school_holidays',
    description:
      'School holidays (term breaks: Christmas, Easter, summer, etc.) for a European country in a date range, optionally scoped to one subdivision. This is the unique value-add over worldwide public-holiday sources — school calendars vary by region. EUROPE-focused (~30 countries). Returns each break with its localized name, dates, and observing subdivisions. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code, e.g. "DE", "FR", "NL", "CH", "IT".',
        },
        valid_from: { type: 'string', description: 'Start of date range, YYYY-MM-DD.' },
        valid_to: { type: 'string', description: 'End of date range, YYYY-MM-DD.' },
        subdivision_code: {
          type: 'string',
          description: 'Optional subdivision/region code to filter to, e.g. "DE-BY" (Bavaria). Use list_subdivisions to discover codes.',
        },
        language: { type: 'string', description: 'Language for names, ISO 639-1 (default "EN").' },
      },
      required: ['country', 'valid_from', 'valid_to'],
    },
  },
  {
    name: 'list_countries',
    description:
      'List the ~30 European countries OpenHolidays covers, with their ISO codes and official languages. EUROPE-focused. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language for country names, ISO 639-1 (default "EN").' },
      },
    },
  },
  {
    name: 'list_subdivisions',
    description:
      'List the regional subdivisions (federal states, regions, cantons, etc.) of a European country, with their codes and category. Use the returned codes to scope school_holidays. EUROPE-focused. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code, e.g. "DE", "FR", "CH".',
        },
        language: { type: 'string', description: 'Language for names, ISO 639-1 (default "EN").' },
      },
      required: ['country'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'public_holidays':
        return holidays('PublicHolidays', args);
      case 'school_holidays':
        return holidays('SchoolHolidays', args);
      case 'list_countries':
        return listCountries(args);
      case 'list_subdivisions':
        return listSubdivisions(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

function getCountry(args: Record<string, unknown>): string {
  return typeof args.country === 'string' ? args.country.trim().toUpperCase() : '';
}

function getLang(args: Record<string, unknown>): string {
  return (typeof args.language === 'string' && args.language.trim()) || 'EN';
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) return { error: `openholidays: ${res.status} ${(await res.text()).slice(0, 200)}` };
  return res.json();
}

async function holidays(endpoint: string, args: Record<string, unknown>): Promise<unknown> {
  const country = getCountry(args);
  if (country.length !== 2) return { error: 'country must be a 2-letter ISO 3166-1 alpha-2 code', country: args.country ?? null };
  const validFrom = typeof args.valid_from === 'string' ? args.valid_from.trim() : '';
  const validTo = typeof args.valid_to === 'string' ? args.valid_to.trim() : '';
  if (!validFrom || !validTo) return { error: 'valid_from and valid_to are required (YYYY-MM-DD)' };
  const lang = getLang(args);

  const params = new URLSearchParams({
    countryIsoCode: country,
    languageIsoCode: lang,
    validFrom,
    validTo,
  });
  if (endpoint === 'SchoolHolidays' && typeof args.subdivision_code === 'string' && args.subdivision_code.trim()) {
    params.set('subdivisionCode', args.subdivision_code.trim());
  }

  const data = await fetchJson(`${BASE}/${endpoint}?${params.toString()}`);
  if (data && typeof data === 'object' && 'error' in data) return data;

  const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  return {
    country,
    count: list.length,
    holidays: list.map((h) => mapHoliday(h, lang)),
  };
}

async function listCountries(args: Record<string, unknown>): Promise<unknown> {
  const lang = getLang(args);
  const data = await fetchJson(`${BASE}/Countries?languageIsoCode=${encodeURIComponent(lang)}`);
  if (data && typeof data === 'object' && 'error' in data) return data;

  const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  return {
    count: list.length,
    countries: list.map((c) => ({
      code: c.isoCode,
      name: localName(c.name, lang),
      official_languages: c.officialLanguages ?? [],
    })),
  };
}

async function listSubdivisions(args: Record<string, unknown>): Promise<unknown> {
  const country = getCountry(args);
  if (country.length !== 2) return { error: 'country must be a 2-letter ISO 3166-1 alpha-2 code', country: args.country ?? null };
  const lang = getLang(args);

  const data = await fetchJson(
    `${BASE}/Subdivisions?countryIsoCode=${encodeURIComponent(country)}&languageIsoCode=${encodeURIComponent(lang)}`,
  );
  if (data && typeof data === 'object' && 'error' in data) return data;

  const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  return {
    country,
    count: list.length,
    subdivisions: list.map((s) => ({
      code: s.code,
      short_name: s.shortName,
      name: localName(s.name, lang),
      category: localName(s.category, lang),
    })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
