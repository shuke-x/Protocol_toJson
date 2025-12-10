import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, CheckCircle2, QrCode, Send, Sparkles } from "lucide-react";
import { protocolSchemas, type FieldDefinition, type ProtocolKey, type ProtocolSchema } from "../config";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Select } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

type FormState = Record<string, string | number | boolean>;
type ErrorState = Record<string, string | undefined>;
type FormStateMap = Record<ProtocolKey, FormState>;
type ErrorStateMap = Record<ProtocolKey, ErrorState>;

const STORAGE_PREFIX = "ctj_state_";

function emptyStates(): FormStateMap {
  return protocolSchemas.reduce((acc, schema) => {
    acc[schema.key] = initialValues(schema);
    return acc;
  }, {} as FormStateMap);
}

function initialValues(schema: ProtocolSchema): FormState {
  const base: FormState = { type: schema.key };
  schema.fields.forEach((f) => {
    if (f.type === "checkbox") {
      base[f.name] = Boolean(f.default);
    } else if (f.default !== undefined) {
      base[f.name] = typeof f.default === "number" ? String(f.default) : (f.default as string);
    } else {
      base[f.name] = "";
    }
  });
  return base;
}

function BuilderPage() {
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState<ProtocolKey>(protocolSchemas[0].key);
  const [selectedKeys, setSelectedKeys] = useState<ProtocolKey[]>([protocolSchemas[0].key]);
  const [formStates, setFormStates] = useState<FormStateMap>(() => emptyStates());
  const [errors, setErrors] = useState<ErrorStateMap>({});
  const [jsonOutput, setJsonOutput] = useState("// JSON will appear here");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Load persisted state on login, fallback to defaults for guests.
  useEffect(() => {
    if (!user) {
      setFormStates(emptyStates());
      setSelectedKeys([protocolSchemas[0].key]);
      setActiveKey(protocolSchemas[0].key);
      return;
    }
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${user.username}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setFormStates({ ...emptyStates(), ...(parsed.formStates ?? {}) });
        setSelectedKeys(parsed.selectedKeys ?? [protocolSchemas[0].key]);
        setActiveKey(parsed.activeKey ?? protocolSchemas[0].key);
        return;
      } catch {
        // fallthrough to defaults
      }
    }
    setFormStates(emptyStates());
    setSelectedKeys([protocolSchemas[0].key]);
    setActiveKey(protocolSchemas[0].key);
  }, [user]);

  // Persist state when logged in
  useEffect(() => {
    if (!user) return;
    const payload = { formStates, selectedKeys, activeKey };
    localStorage.setItem(`${STORAGE_PREFIX}${user.username}`, JSON.stringify(payload));
  }, [user, formStates, selectedKeys, activeKey]);

  const activeSchema = useMemo(
    () => protocolSchemas.find((s) => s.key === activeKey) ?? protocolSchemas[0],
    [activeKey],
  );

  const getFormValues = (schemaKey: ProtocolKey) =>
    formStates[schemaKey] ??
    initialValues(protocolSchemas.find((s) => s.key === schemaKey) ?? protocolSchemas[0]);

  const handleFieldChange = (field: FieldDefinition, value: string | boolean) => {
    setFormStates((prev) => ({
      ...prev,
      [activeSchema.key]: {
        ...getFormValues(activeSchema.key),
        [field.name]: value,
      },
    }));
    setErrors((prev) => ({
      ...prev,
      [activeSchema.key]: { ...(prev[activeSchema.key] ?? {}), [field.name]: undefined },
    }));
  };

  const buildPayload = (schema: ProtocolSchema, values: FormState) => {
    const payload: Record<string, unknown> = { type: schema.key };

    schema.fields.forEach((field) => {
      const raw = values[field.name];
      if (field.type === "checkbox") {
        payload[field.name] = Boolean(raw);
        return;
      }
      if (field.type === "number") {
        const num = typeof raw === "string" && raw !== "" ? Number(raw) : NaN;
        if (!Number.isNaN(num)) payload[field.name] = num;
        return;
      }
      if (typeof raw === "string") {
        const asText = raw.trim();
        const listFields = ["alpn", "address", "allowedIPs"];
        if (listFields.includes(field.name)) {
          const arr = asText
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          if (arr.length) payload[field.name] = arr;
          return;
        }
        if (asText !== "") {
          payload[field.name] = asText;
        }
      }
    });

    return payload;
  };

  const validateAll = () => {
    const newErrors: ErrorStateMap = {};
    const payloads: unknown[] = [];
    let hasError = false;

    selectedKeys.forEach((key) => {
      const schema = protocolSchemas.find((s) => s.key === key);
      if (!schema) return;
      const values = getFormValues(key);
      const payload = buildPayload(schema, values);
      const parseResult = schema.zodShape.safeParse(payload);
      if (!parseResult.success) {
        hasError = true;
        const fieldErrors: ErrorState = {};
        parseResult.error.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          fieldErrors[path] = issue.message;
        });
        newErrors[key] = fieldErrors;
        return;
      }
      payloads.push(parseResult.data);
    });

    setErrors(newErrors);

    if (hasError || payloads.length === 0) return null;
    const serialized =
      payloads.length === 1
        ? JSON.stringify(payloads[0], null, 2)
        : JSON.stringify(payloads, null, 2);
    setJsonOutput(serialized);
    return serialized;
  };

  const onGenerateJson = () => {
    const serialized = validateAll();
    if (serialized) {
      setQrValue(serialized);
      setSubmitted(false);
    }
  };

  const onGenerateQr = () => {
    const serialized = validateAll();
    if (serialized) {
      setQrValue(serialized);
      setSubmitted(false);
    }
  };

  const onSubmit = () => {
    const serialized = validateAll();
    if (serialized) {
      setQrValue(serialized);
      setSubmitted(true);
    }
  };

  const renderField = (field: FieldDefinition) => {
    const formValues = getFormValues(activeSchema.key);
    const value = formValues ? formValues[field.name] : "";
    const error = errors[activeSchema.key]?.[field.name];
    const label = (
      <div className="flex items-center justify-between">
        <Label htmlFor={`${activeSchema.key}-${field.name}`}>
          {field.label}
          {field.required ? " *" : ""}
        </Label>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    );

    if (field.type === "checkbox") {
      return (
        <div className="rounded-lg border border-border/70 bg-white/5 p-3">
          <Checkbox
            checked={Boolean(value)}
            onChange={(e) => handleFieldChange(field, e.target.checked)}
            title={field.label}
          />
          {field.helper ? <p className="mt-1 text-xs text-muted-foreground">{field.helper}</p> : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div className="flex flex-col gap-2">
          {label}
          <Textarea
            id={`${activeSchema.key}-${field.name}`}
            placeholder={field.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
          {field.helper ? <p className="text-xs text-muted-foreground">{field.helper}</p> : null}
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div className="flex flex-col gap-2">
          {label}
          <Select
            id={`${activeSchema.key}-${field.name}`}
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
          {field.helper ? <p className="text-xs text-muted-foreground">{field.helper}</p> : null}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {label}
        <Input
          id={`${activeSchema.key}-${field.name}`}
          type={field.type === "number" ? "number" : "text"}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          min={field.min}
          max={field.max}
          onChange={(e) => handleFieldChange(field, e.target.value)}
        />
        {field.helper ? <p className="text-xs text-muted-foreground">{field.helper}</p> : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 via-white/2 to-white/0 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.9)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent" className="animate-pulse-soft">
            Schema-driven
          </Badge>
          <Badge variant="outline">React + Vite + Tailwind + shadcn</Badge>
          <Badge variant="default">JSON & QR batch</Badge>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Sparkles size={18} />
            Config to JSON Toolkit
          </div>
          <p className="text-base text-muted-foreground max-w-3xl">
            Multi-select protocols, fill forms, validate with Zod, and serialize to JSON or QR in one go.
            Login is optional; if signed in, your selections and form state are saved locally for convenience.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1.5fr)_340px]">
          <Card className="h-full">
          <CardHeader>
            <CardTitle>Protocols</CardTitle>
            <CardDescription>Multi-select for batch JSON/QR export.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ScrollArea className="space-y-3">
              {protocolSchemas.map((schema) => {
                const selected = selectedKeys.includes(schema.key);
                const schemaErrors = errors[schema.key];
                return (
                  <button
                    key={schema.key}
                    onClick={() => setActiveKey(schema.key)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left transition-all flex items-start gap-3",
                      activeKey === schema.key
                        ? "border-primary/60 bg-primary/10 text-foreground shadow-sm"
                        : "border-border/70 bg-white/5 text-muted-foreground hover:border-border/40 hover:text-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-[2px] h-4 w-4 rounded border border-border/80 bg-white/5 text-primary focus:ring-primary"
                      checked={selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedKeys((prev) => {
                          const next = prev.includes(schema.key)
                            ? prev.filter((k) => k !== schema.key)
                            : [...prev, schema.key];
                          return next.length === 0 ? prev : (next as ProtocolKey[]);
                        });
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{schema.label}</span>
                        <span className="text-xs text-muted-foreground">{schema.fields.length} fields</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{schema.description}</p>
                      {schemaErrors ? (
                        <p className="mt-1 text-xs text-destructive">Has validation issues</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activeSchema.label}</CardTitle>
                <CardDescription>{activeSchema.description}</CardDescription>
              </div>
              <Badge variant="outline">{activeSchema.fields.length} fields</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeSchema.fields.map((field) => (
                <div key={field.name} className="animate-fade-in">
                  {renderField(field)}
                </div>
              ))}
            </div>

            {Object.keys(errors[activeSchema.key] ?? {}).length ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
                Please fix the highlighted fields.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={onGenerateJson} className="gap-2">
                <Sparkles size={16} />
                Generate JSON
              </Button>
              <Button variant="secondary" onClick={onGenerateQr} className="gap-2">
                <QrCode size={16} />
                Generate QR
              </Button>
              <Button variant="ghost" onClick={onSubmit} className="gap-2">
                <Send size={16} />
                Submit
              </Button>
            </div>

            {submitted ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 size={16} />
                Form submitted (payload serialized below).
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              <Badge variant="accent" className="gap-1">
                Live
                <ArrowRight size={14} />
                JSON/QR
              </Badge>
            </div>
            <CardDescription>Serialized JSON plus QR for scanning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border/70 bg-slate-900/60 p-3 font-mono text-xs text-emerald-200 shadow-inner min-h-[200px]">
              <pre className="whitespace-pre-wrap break-words">{jsonOutput}</pre>
            </div>
            <div className="rounded-lg border border-border/70 bg-white/5 p-4 text-center">
              {qrValue ? (
                <div className="flex flex-col items-center gap-2">
                  <QRCodeSVG value={qrValue} size={180} bgColor="transparent" fgColor="#7ff5c5" />
                  <p className="text-xs text-muted-foreground">QR encodes the generated JSON.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Generate JSON to see the QR here.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BuilderPage;
