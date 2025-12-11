# Config to JSON

Schema-driven builder that turns proxy/VPN form inputs into ready-to-use JSON (and QR codes). Built with React, Vite, Tailwind, shadcn UI, and Zod validation.

## Features
- Multi-protocol support with shared schema definitions in `src/config.ts`.
- VLESS export matches Reality/TLS structure (type/tag/listen/listen_port/users/tls.reality).
- Inline Zod validation with error surfacing before serialization.
- Generate JSON and QR in one click; batch multiple protocols.
- Optional local “login” simply stores state per-username in `localStorage`.

## Quick start
1. Install deps: `npm install`
2. Dev server: `npm run dev`
3. Type check: `npm run lint`
4. Production build: `npm run build` then `npm run preview`

## Usage
- Go to Builder, pick one or more protocols, and fill the fields.
- Click **Generate JSON** or **Generate QR** to see the serialized payload.
- For VLESS Reality, fill tag/listen/listen_port/uuid/name/server_name/private_key/short_id and the flow if needed. Output matches:

```json
{
  "type": "vless",
  "tag": "vless-in",
  "listen": "::",
  "listen_port": 443,
  "users": [
    {
      "uuid": "your-uuid",
      "flow": "xtls-rprx-vision",
      "name": "my-user"
    }
  ],
  "tls": {
    "enabled": true,
    "server_name": "www.microsoft.com",
    "reality": {
      "enabled": true,
      "handshake": {
        "server": "www.microsoft.com",
        "port": 443
      },
      "private_key": "your-private-key",
      "short_id": [""]
    }
  }
}
```

## Project structure
- `src/config.ts` — protocol schemas, field definitions, and Zod shapes.
- `src/pages/BuilderPage.tsx` — form rendering, validation, and JSON/QR generation.
- `src/context/AuthContext.tsx` — simple local username state.
- `src/components` — UI primitives (shadcn-style buttons, inputs, etc.).

## Extending
- Add or adjust protocols by editing `protocolSchemas` in `src/config.ts`.
- Map new fields to payloads inside `buildPayload` (or a protocol-specific builder) in `BuilderPage`.
- Tailwind tokens live in `tailwind.config.ts` if you want to tweak theming.***
