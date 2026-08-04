# mcp-openholidays

OpenHolidays MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Openholidays data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
