import { z } from "zod";

export type FieldKind = "text" | "number" | "select" | "textarea" | "checkbox";

export type FieldDefinition = {
  name: string;
  label: string;
  type: FieldKind;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  default?: string | number | boolean;
  options?: string[];
  pattern?: RegExp;
  helper?: string;
};

export type ProtocolSchema = {
  key: string;
  label: string;
  description: string;
  fields: FieldDefinition[];
  zodShape: z.ZodTypeAny;
  zodOutputShape?: z.ZodTypeAny;
};

const uuidRegex = /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/;

const vlessOutputShape = z.object({
  type: z.literal("vless"),
  tag: z.string().min(1, "Tag is required"),
  listen: z.string().min(1, "Listen is required"),
  listen_port: z.number().int().min(1).max(65535),
  users: z
    .array(
      z.object({
        uuid: z.string().regex(uuidRegex, "UUID format looks off"),
        flow: z.enum(["xtls-rprx-vision", "xtls-rprx-splice", "none"]).optional(),
        name: z.string().min(1, "User name is required"),
      }),
    )
    .min(1, "At least one user is required"),
  tls: z.object({
    enabled: z.boolean(),
    server_name: z.string().min(1, "Server name is required"),
    reality: z.object({
      enabled: z.boolean(),
      handshake: z.object({
        server: z.string().min(1, "Handshake server is required"),
        port: z.number().int().min(1).max(65535).optional(),
      }),
      private_key: z.string().min(1, "Private key is required"),
      short_id: z.array(z.string()),
    }),
  }),
});

export const protocolSchemas: ProtocolSchema[] = [
  {
    key: "vless",
    label: "VLESS",
    description: "VLESS (VMess-less) with TLS/Reality structure.",
    fields: [
      {
        name: "tag",
        label: "Tag",
        type: "text",
        placeholder: "vless-in",
        required: true,
        default: "vless-in",
      },
      {
        name: "listen",
        label: "Listen",
        type: "text",
        placeholder: "::",
        default: "::",
      },
      {
        name: "listen_port",
        label: "Listen Port",
        type: "text",
        placeholder: "443",
        required: true,
        min: 1,
        max: 65535,
        default: 443,
      },
      {
        name: "name",
        label: "User Name",
        type: "text",
        placeholder: "my-user",
        required: true,
      },
      {
        name: "uuid",
        label: "UUID",
        type: "text",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        required: true,
        pattern: uuidRegex,
      },
      {
        name: "flow",
        label: "Flow",
        type: "select",
        options: ["xtls-rprx-vision", "xtls-rprx-splice", "none"],
        default: "xtls-rprx-vision",
      },
      {
        name: "tls",
        label: "TLS",
        type: "checkbox",
        default: true,
      },
      {
        name: "server_name",
        label: "Server Name (SNI)",
        type: "text",
        placeholder: "www.microsoft.com",
        required: true,
      },
      {
        name: "reality",
        label: "Reality",
        type: "checkbox",
        default: true,
      },
      {
        name: "private_key",
        label: "Private Key",
        type: "text",
        placeholder: "encoded private key",
        required: true,
      },
      {
        name: "short_id",
        label: "Short ID",
        type: "text",
        placeholder: "comma separated, e.g. a1,b2",
      },
    ],
    // 针对表单输入本身做校验，而不是构建后的 JSON 结构，便于逐字段报错
    zodShape: z.object({
      type: z.literal("vless"),
      tag: z.string().trim().min(1, "Tag is required"),
      listen: z.string(),
      listen_port: z.coerce.number().int().min(1).max(65535),
      name: z.string().trim().min(1, "User name is required"),
      uuid: z.string().trim().regex(uuidRegex, "UUID format looks off"),
      flow: z.enum(["xtls-rprx-vision", "xtls-rprx-splice", "none"]).optional(),
      tls: z.boolean(),
      server_name: z.string().trim().min(1, "Server name is required"),
      reality: z.boolean(),
      private_key: z.string().trim().min(1, "Private key is required"),
      short_id: z.string().optional(),
    }),
    // 导出 JSON 的最终结构校验
    zodOutputShape: vlessOutputShape,
  },
  {
    key: "vmess",
    label: "VMess",
    description: "VMess with TLS and transport options.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "VMess node", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "example.com", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "443", required: true, min: 1, max: 65535 },
      { name: "uuid", label: "UUID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true, pattern: uuidRegex },
      { name: "security", label: "Security", type: "select", options: ["auto", "aes-128-gcm", "chacha20-poly1305", "none"], default: "auto", required: true },
      { name: "tls", label: "TLS", type: "checkbox", default: true },
      { name: "sni", label: "SNI", type: "text", placeholder: "cdn.example.com" },
      { name: "alpn", label: "ALPN", type: "text", placeholder: "h2,http/1.1", helper: "Comma-separated list" },
      { name: "network", label: "Network", type: "select", options: ["tcp", "ws", "grpc"], default: "tcp" },
      { name: "path", label: "WS/GRPC Path", type: "text", placeholder: "/websocket" },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("vmess"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      uuid: z.string().regex(uuidRegex, "UUID format looks off"),
      security: z.enum(["auto", "aes-128-gcm", "chacha20-poly1305", "none"]),
      tls: z.boolean().optional(),
      sni: z.string().optional(),
      alpn: z.array(z.string()).optional(),
      network: z.enum(["tcp", "ws", "grpc"]).optional(),
      path: z.string().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "trojan",
    label: "Trojan",
    description: "Trojan with TLS/SNI options.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Trojan node", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "example.com", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "443", required: true, min: 1, max: 65535 },
      { name: "password", label: "Password", type: "text", placeholder: "strong-secret", required: true },
      { name: "tls", label: "TLS", type: "checkbox", default: true },
      { name: "sni", label: "SNI", type: "text", placeholder: "cdn.example.com" },
      { name: "alpn", label: "ALPN", type: "text", placeholder: "h2,http/1.1", helper: "Comma-separated list" },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("trojan"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      password: z.string().min(1),
      tls: z.boolean().optional(),
      sni: z.string().optional(),
      alpn: z.array(z.string()).optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "shadowsocks-2022",
    label: "Shadowsocks 2022",
    description: "Modern Shadowsocks AEAD 2022 with password/keys.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "SS2022 node", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "1.2.3.4", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "8443", required: true, min: 1, max: 65535 },
      { name: "method", label: "Method", type: "select", options: ["2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm", "2022-blake3-chacha20-poly1305"], default: "2022-blake3-aes-128-gcm", required: true },
      { name: "password", label: "Password/Key", type: "text", placeholder: "base64 or strong secret", required: true },
      { name: "udp", label: "UDP Relay", type: "checkbox", default: true },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("shadowsocks-2022"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      method: z.enum(["2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm", "2022-blake3-chacha20-poly1305"]),
      password: z.string().min(1),
      udp: z.boolean().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "shadowsocks",
    label: "Shadowsocks",
    description: "Classic Shadowsocks config with plugin support.",
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "SS node",
        required: true,
      },
      {
        name: "server",
        label: "Server",
        type: "text",
        placeholder: "1.2.3.4",
        required: true,
      },
      {
        name: "port",
        label: "Port",
        type: "number",
        placeholder: "8388",
        required: true,
        min: 1,
        max: 65535,
      },
      {
        name: "method",
        label: "Cipher Method",
        type: "select",
        options: ["aes-256-gcm", "chacha20-ietf-poly1305", "aes-128-gcm"],
        required: true,
        default: "aes-256-gcm",
      },
      {
        name: "password",
        label: "Password",
        type: "text",
        placeholder: "secret",
        required: true,
      },
      {
        name: "plugin",
        label: "Plugin (opt)",
        type: "text",
        placeholder: "v2ray-plugin",
      },
      {
        name: "pluginOpts",
        label: "Plugin Options",
        type: "textarea",
        placeholder: "mode=websocket;host=example.com",
      },
      {
        name: "udp",
        label: "UDP Relay",
        type: "checkbox",
        default: true,
      },
      {
        name: "remark",
        label: "Remark",
        type: "textarea",
        placeholder: "Any notes",
      },
    ],
    zodShape: z.object({
      type: z.literal("shadowsocks"),
      name: z.string().min(1, "Name is required"),
      server: z.string().min(1, "Server is required"),
      port: z.number().int().min(1).max(65535),
      method: z.enum(["aes-256-gcm", "chacha20-ietf-poly1305", "aes-128-gcm"]),
      password: z.string().min(1, "Password is required"),
      plugin: z.string().optional(),
      pluginOpts: z.string().optional(),
      udp: z.boolean().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "hysteria2",
    label: "Hysteria2",
    description: "QUIC-based Hysteria2 with auth and bandwidth hints.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Hysteria node", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "example.com", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "443", required: true, min: 1, max: 65535 },
      { name: "auth", label: "Auth", type: "text", placeholder: "password/token", required: true },
      { name: "sni", label: "SNI", type: "text", placeholder: "cdn.example.com" },
      { name: "alpn", label: "ALPN", type: "text", placeholder: "h3", helper: "Comma-separated list" },
      { name: "upMbps", label: "Up Mbps", type: "number", placeholder: "20", helper: "Client hint" },
      { name: "downMbps", label: "Down Mbps", type: "number", placeholder: "100", helper: "Client hint" },
      { name: "obfs", label: "Obfs Password", type: "text", placeholder: "optional obfs password" },
      { name: "insecure", label: "Skip TLS Verify", type: "checkbox", default: false },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("hysteria2"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      auth: z.string().min(1),
      sni: z.string().optional(),
      alpn: z.array(z.string()).optional(),
      upMbps: z.number().int().positive().optional(),
      downMbps: z.number().int().positive().optional(),
      obfs: z.string().optional(),
      insecure: z.boolean().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "tuic",
    label: "TUIC",
    description: "TUIC v5 client with UUID auth and congestion control.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "TUIC node", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "example.com", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "443", required: true, min: 1, max: 65535 },
      { name: "uuid", label: "UUID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true, pattern: uuidRegex },
      { name: "password", label: "Password", type: "text", placeholder: "strong secret", required: true },
      { name: "alpn", label: "ALPN", type: "text", placeholder: "h3", helper: "Comma-separated list" },
      { name: "sni", label: "SNI", type: "text", placeholder: "cdn.example.com" },
      { name: "congestion", label: "Congestion Control", type: "select", options: ["bbr", "cubic", "new_reno"], default: "bbr" },
      { name: "udpRelayMode", label: "UDP Relay Mode", type: "select", options: ["native", "quic"], default: "native" },
      { name: "heartbeat", label: "Heartbeat Interval (s)", type: "number", placeholder: "15", helper: "Keepalive interval" },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("tuic"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      uuid: z.string().regex(uuidRegex, "UUID format looks off"),
      password: z.string().min(1),
      alpn: z.array(z.string()).optional(),
      sni: z.string().optional(),
      congestion: z.enum(["bbr", "cubic", "new_reno"]).optional(),
      udpRelayMode: z.enum(["native", "quic"]).optional(),
      heartbeat: z.number().int().positive().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "wireguard",
    label: "WireGuard",
    description: "WireGuard client with peer endpoint and keys.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "WG tunnel", required: true },
      { name: "endpoint", label: "Endpoint", type: "text", placeholder: "example.com:51820", required: true },
      { name: "address", label: "Addresses", type: "text", placeholder: "10.0.0.2/32,fd00::2/128", helper: "Comma-separated" },
      { name: "privateKey", label: "Private Key", type: "text", placeholder: "base64 key", required: true },
      { name: "peerPublicKey", label: "Peer Public Key", type: "text", placeholder: "base64 key", required: true },
      { name: "preSharedKey", label: "Pre-shared Key", type: "text", placeholder: "optional" },
      { name: "allowedIPs", label: "Allowed IPs", type: "text", placeholder: "0.0.0.0/0,::/0", helper: "Comma-separated" },
      { name: "mtu", label: "MTU", type: "number", placeholder: "1420" },
      { name: "keepalive", label: "Persistent Keepalive (s)", type: "number", placeholder: "25" },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("wireguard"),
      name: z.string().min(1),
      endpoint: z.string().min(1),
      address: z.array(z.string()).optional(),
      privateKey: z.string().min(1),
      peerPublicKey: z.string().min(1),
      preSharedKey: z.string().optional(),
      allowedIPs: z.array(z.string()).optional(),
      mtu: z.number().int().positive().optional(),
      keepalive: z.number().int().positive().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "socks",
    label: "SOCKS",
    description: "SOCKS5 client with optional auth.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "SOCKS proxy", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "127.0.0.1", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "1080", required: true, min: 1, max: 65535 },
      { name: "username", label: "Username", type: "text", placeholder: "optional" },
      { name: "password", label: "Password", type: "text", placeholder: "optional" },
      { name: "udp", label: "UDP Relay", type: "checkbox", default: true },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("socks"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      username: z.string().optional(),
      password: z.string().optional(),
      udp: z.boolean().optional(),
      remark: z.string().optional(),
    }),
  },
  {
    key: "http",
    label: "HTTP",
    description: "HTTP CONNECT proxy with optional auth and TLS.",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "HTTP proxy", required: true },
      { name: "server", label: "Server", type: "text", placeholder: "127.0.0.1", required: true },
      { name: "port", label: "Port", type: "number", placeholder: "8080", required: true, min: 1, max: 65535 },
      { name: "username", label: "Username", type: "text", placeholder: "optional" },
      { name: "password", label: "Password", type: "text", placeholder: "optional" },
      { name: "tls", label: "TLS", type: "checkbox", default: false },
      { name: "sni", label: "SNI", type: "text", placeholder: "cdn.example.com" },
      { name: "remark", label: "Remark", type: "textarea", placeholder: "Any notes" },
    ],
    zodShape: z.object({
      type: z.literal("http"),
      name: z.string().min(1),
      server: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      username: z.string().optional(),
      password: z.string().optional(),
      tls: z.boolean().optional(),
      sni: z.string().optional(),
      remark: z.string().optional(),
    }),
  },
];

export type ProtocolKey = (typeof protocolSchemas)[number]["key"];
