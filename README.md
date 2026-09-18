# mcp-openholidays

OpenHolidays MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `public_holidays` | Public (statutory) holidays for a European country in a date range, with regional subdivisions. EUROPE-focused (~30 countries: DE, FR, NL, CH, IT, AT, BE, ES, PL, etc.). Returns each holiday with its localized name, dates, whether it is nationwide, and which subdivisions observe it. Keyless. For school terms/breaks use school_holidays instead. |
| `school_holidays` | School holidays (term breaks: Christmas, Easter, summer, etc.) for a European country in a date range, optionally scoped to one subdivision. This is the unique value-add over worldwide public-holiday sources — school calendars vary by region. EUROPE-focused (~30 countries). Returns each break with its localized name, dates, and observing subdivisions. Keyless. |
| `list_countries` | List the ~30 European countries OpenHolidays covers, with their ISO codes and official languages. EUROPE-focused. Keyless. |
| `list_subdivisions` | List the regional subdivisions (federal states, regions, cantons, etc.) of a European country, with their codes and category. Use the returned codes to scope school_holidays. EUROPE-focused. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "openholidays": {
      "url": "https://gateway.pipeworx.io/openholidays/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/openholidays/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Openholidays data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/public_holidays \
  -H 'Content-Type: application/json' \
  -d '{"country":"DE","valid_from":"2024-01-01","valid_to":"2024-12-31"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/public_holidays`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
