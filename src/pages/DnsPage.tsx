import { useEffect, useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import EditableTable, { type TableColumn } from "../components/EditableTable";
import { cn } from "../lib/utils";

type DnsServer = {
  id: string;
  tag: string;
  address: string;
  detour: string;
};

type DnsRule = {
  id: string;
  geosite: string;
  outbound: string;
  server: string;
};

type DnsFormValues = {
  strategy: string;
  servers: DnsServer[];
  rules: DnsRule[];
};

const defaultServers: DnsServer[] = [
  { id: "srv-google", tag: "google", address: "8.8.8.8", detour: "direct" },
  { id: "srv-cloudflare", tag: "cloudflare", address: "1.1.1.1", detour: "direct" },
  { id: "srv-adblock", tag: "adblock", address: "94.140.14.14", detour: "direct" },
];

const defaultRules: DnsRule[] = [
  { id: "rule-ads", geosite: "category-ads-all", outbound: "", server: "adblock" },
  { id: "rule-cn", geosite: "cn", outbound: "", server: "google" },
  { id: "rule-any", geosite: "", outbound: "any", server: "cloudflare" },
];

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? Date.now().toString(36)}`;

function DnsPage() {
  const form = useForm({
    defaultValues: {
      strategy: "ipv4_only",
      servers: defaultServers,
      rules: defaultRules,
    },
    onSubmit: ({ value }) => {
      const issues = validate(value);
      setErrors(issues);
      if (issues.length) return;
      const payload = buildPayload(value);
      setJsonOutput(JSON.stringify(payload, null, 2));
    },
  });

  const values = useStore(form.store, (state) => state.values) as DnsFormValues;
  const [jsonOutput, setJsonOutput] = useState("// JSON will appear here");
  const [errors, setErrors] = useState<string[]>([]);

  const serverTags = useMemo(
    () => (values?.servers ?? []).map((s) => s.tag).filter(Boolean),
    [values?.servers],
  );

  const updateServer = (index: number, field: keyof DnsServer, value: string) => {
    form.setFieldValue(
      "servers",
      (prev = []) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      },

    );
  };

  const updateRule = (index: number, field: keyof DnsRule, value: string) => {
    form.setFieldValue(
      "rules",
      (prev = []) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      },

    );
  };

  const addServer = () => {
    form.setFieldValue(
      "servers",
      (prev = []) => [
        ...prev,
        {
          id: createId("srv"),
          tag: "",
          address: "",
          detour: "direct",
        },
      ],

    );
  };

  const addRule = () => {
    form.setFieldValue(
      "rules",
      (prev = []) => [
        ...prev,
        {
          id: createId("rule"),
          geosite: "",
          outbound: "",
          server: serverTags[0] ?? "",
        },
      ],

    );
  };

  const removeServer = (index: number) => {
    form.removeFieldValue("servers", index);
  };

  const removeRule = (index: number) => {
    form.removeFieldValue("rules", index);
  };

  const buildPayload = (formValue: DnsFormValues) => {
    const dns: Record<string, unknown> = {
      servers: (formValue.servers ?? [])
        .filter((s) => s.tag.trim() || s.address.trim() || s.detour.trim())
        .map((s) => ({
          tag: s.tag.trim(),
          address: s.address.trim(),
          detour: s.detour.trim(),
        })),
      rules: (formValue.rules ?? [])
        .filter((r) => r.server.trim() || r.geosite.trim() || r.outbound.trim())
        .map((r) => {
          const entry: Record<string, string> = { server: r.server.trim() };
          if (r.geosite.trim()) entry.geosite = r.geosite.trim();
          if (r.outbound.trim()) entry.outbound = r.outbound.trim();
          return entry;
        }),
    };

    if (formValue.strategy.trim()) {
      dns.strategy = formValue.strategy.trim();
    }

    return { dns };
  };

  const validate = (formValue: DnsFormValues) => {
    const issues: string[] = [];
    const servers = formValue.servers ?? [];
    const rules = formValue.rules ?? [];

    if (!servers.length) issues.push("至少保留一个 DNS 服务器。");
    servers.forEach((s, idx) => {
      if (!s.tag.trim()) issues.push(`Server #${idx + 1}: Tag 不能为空。`);
      if (!s.address.trim()) issues.push(`Server #${idx + 1}: Address 不能为空。`);
      if (!s.detour.trim()) issues.push(`Server #${idx + 1}: Detour 不能为空。`);
    });

    if (!rules.length) issues.push("至少保留一条 DNS 规则。");
    rules.forEach((r, idx) => {
      if (!r.server.trim()) issues.push(`Rule #${idx + 1}: Server 不能为空。`);
      if (!r.geosite.trim() && !r.outbound.trim()) {
        issues.push(`Rule #${idx + 1}: 需要 geosite 或 outbound 条件之一。`);
      }
    });

    return issues;
  };

  const serverColumns: TableColumn<DnsServer>[] = [
    {
      header: "Tag",
      cell: ({ index }) => (
        <Input
          value={values?.servers?.[index]?.tag ?? ""}
          placeholder="google"
          onChange={(e) => updateServer(index, "tag", e.target.value)}
        />
      ),
    },
    {
      header: "Address",
      cell: ({ index }) => (
        <Input
          value={values?.servers?.[index]?.address ?? ""}
          placeholder="8.8.8.8"
          onChange={(e) => updateServer(index, "address", e.target.value)}
        />
      ),
    },
    {
      header: "Detour",
      cell: ({ index }) => (
        <Input
          value={values?.servers?.[index]?.detour ?? ""}
          placeholder="direct"
          onChange={(e) => updateServer(index, "detour", e.target.value)}
        />
      ),
    },
  ];

  const ruleColumns: TableColumn<DnsRule>[] = [
    {
      header: "Geosite",
      cell: ({ index }) => (
        <Input
          value={values?.rules?.[index]?.geosite ?? ""}
          placeholder="category-ads-all"
          onChange={(e) => updateRule(index, "geosite", e.target.value)}
        />
      ),
    },
    {
      header: "Outbound",
      cell: ({ index }) => (
        <Input
          value={values?.rules?.[index]?.outbound ?? ""}
          placeholder="any"
          onChange={(e) => updateRule(index, "outbound", e.target.value)}
        />
      ),
    },
    {
      header: "Server",
      className: "min-w-[140px]",
      cell: ({ index }) => (
        <Select
          value={values?.rules?.[index]?.server ?? ""}
          onChange={(e) => updateRule(index, "server", e.target.value)}
          className={cn("w-full h-9 text-xs", !values?.rules?.[index]?.server ? "text-muted-foreground" : "")}
        >
          <option value="">选择 server</option>
          {serverTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </Select>
      ),
    },
  ];

  useEffect(() => {
    form.handleSubmit();
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex h-full flex-col space-y-6 overflow-y-auto"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 via-white/2 to-white/0 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.9)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">DNS routing</Badge>
          <Badge variant="outline">TanStack Form</Badge>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-lg font-semibold text-primary">DNS 路由配置</div>
          <p className="text-base text-muted-foreground max-w-3xl">
            通过紧凑表格维护 DNS servers 与 rules，使用 TanStack Form 管理状态，一键生成 sing-box JSON 片段。
          </p>
        </div>
      </div>

      <div className=" min-h-0  lg:grid-cols-[1.4fr_1fr] space-y-4">
        <div className="flex justify-start items-center gap-4">
          <EditableTable
            title="Servers"
            description="填写 DNS 服务器的 tag、地址与 detour。"
            addLabel="新增 Server"
            rows={values?.servers ?? []}
            columns={serverColumns}
            onAdd={addServer}
            onRemove={removeServer}
          />
          <EditableTable
            title="Rules"
            description="将 geosite/outbound 条件指向对应 DNS server。"
            addLabel="新增 Rule"
            addVariant="secondary"
            rows={values?.rules ?? []}
            columns={ruleColumns}
            onAdd={addRule}
            onRemove={removeRule}
          />
        </div>

        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>导出 JSON</CardTitle>
                <CardDescription>转化后的 sing-box dns 片段。</CardDescription>
              </div>
              <Button type="submit" className="h-9 px-4">
                Generate JSON
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy" className="text-xs">
                Strategy
              </Label>
              <form.Field name="strategy" defaultValue="ipv4_only">
                {(field) => (
                  <Select
                    id="strategy"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full h-9 text-xs"
                  >
                    <option value="ipv4_only">ipv4_only</option>
                    <option value="ipv6_only">ipv6_only</option>
                    <option value="prefer_ipv4">prefer_ipv4</option>
                    <option value="prefer_ipv6">prefer_ipv6</option>
                  </Select>
                )}
              </form.Field>
              <p className="text-xs text-muted-foreground">
                默认推荐 ipv4_only，避免 IPv6 不稳导致的断流。
              </p>
            </div>
            {errors.length ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-1">
                {errors.map((err) => (
                  <p key={err}>{err}</p>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto m-5">
            <div className="rounded-md border border-border/70 bg-slate-900/60 p-3 font-mono text-[11px] text-emerald-200 shadow-inner min-h-[220px]">
              <pre className="whitespace-pre-wrap break-words leading-relaxed">{jsonOutput}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default DnsPage;
