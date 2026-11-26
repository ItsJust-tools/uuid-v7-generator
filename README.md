# UUID v7 Generator

Generate and inspect UUID v7 (time-ordered) identifiers, decode the embedded millisecond timestamp, and export the results in the format you need.

**Live:** [uuid-v7-generator.itsjust.tools](https://uuid-v7-generator.itsjust.tools)

## Features

- Generate a single UUID v7 with one click, or bulk-generate 1–1000 at once
- Decode any UUID v7 back to its embedded millisecond Unix timestamp and ISO date
- Binary/hex breakdown of the timestamp, version nibble and variant bits
- Output formats: plain list, uppercase, hyphenless, and JSON array
- Copy-to-clipboard for every field and batch
- Monotonic ordering note explaining why v7 sorts correctly
- 100% client-side — no data ever leaves your browser; shareable state via URL

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-uuid-v7-generator .
docker run -p 3000:3000 itsjust-uuid-v7-generator
```

## License

MIT
