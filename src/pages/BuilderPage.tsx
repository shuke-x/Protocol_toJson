import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, CheckCircle2, Copy, QrCode, Send, Sparkles } from "lucide-react";
import { protocolSchemas, type FieldDefinition, type ProtocolKey, type ProtocolSchema } from "../config";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Switch } from "../components/ui/switch";
import { cn } from "../lib/utils";
import { UUID } from "uuidjs";
import { loadBuilderState, saveBuilderState } from "../store/builderStore";

type FormState = Record<string, string | number | boolean>;
type ErrorState = Record<string, string | undefined>;
type FormStateMap = Record<ProtocolKey, FormState>;
type ErrorStateMap = Record<ProtocolKey, ErrorState>;

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
  const defaultState = {
    formStates: emptyStates(),
    selectedKeys: [protocolSchemas[0].key] as ProtocolKey[],
    activeKey: protocolSchemas[0].key as ProtocolKey,
  };

  const initialState = loadBuilderState(defaultState);

  const [activeKey, setActiveKey] = useState<ProtocolKey>(initialState.activeKey);
  const [selectedKeys, setSelectedKeys] = useState<ProtocolKey[]>(initialState.selectedKeys);
  const [formStates, setFormStates] = useState<FormStateMap>(() => initialState.formStates);
  const [errors, setErrors] = useState<ErrorStateMap>({});
  const [jsonOutput, setJsonOutput] = useState("// JSON will appear here");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveBuilderState({ formStates, selectedKeys, activeKey });
  }, [formStates, selectedKeys, activeKey]);

  const activeSchema = useMemo(
    () => protocolSchemas.find((s) => s.key === activeKey) ?? protocolSchemas[0],
    [activeKey],
  );

  const getStoredValues = useCallback(
    (schemaKey: ProtocolKey) =>
      formStates[schemaKey] ??
      initialValues(protocolSchemas.find((s) => s.key === schemaKey) ?? protocolSchemas[0]),
    [formStates],
  );

  const form = useForm({
    defaultValues: getStoredValues(activeSchema.key) as FormState,
  });

  const activeValues = useStore(form.store, (state) => state.values as FormState);

  // Keep form in sync when switching protocols
  useEffect(() => {
    const stored = getStoredValues(activeSchema.key);
    form.reset(stored);
    setErrors((prev) => ({ ...prev, [activeSchema.key]: {} }));
  }, [activeSchema.key, form, getStoredValues]);

  // Persist active form values into shared map for multi-protocol state
  useEffect(() => {
    setFormStates((prev) => {
      const stored = prev[activeSchema.key] ??
        initialValues(protocolSchemas.find((s) => s.key === activeSchema.key) ?? protocolSchemas[0]);
      return {
        ...prev,
        [activeSchema.key]: { ...stored, ...(activeValues as FormState) },
      };
    });
  }, [activeSchema.key, activeValues]);

  const getFormValues = (schemaKey: ProtocolKey) => {
    if (schemaKey === activeSchema.key) {
      return (activeValues as FormState) ?? getStoredValues(schemaKey);
    }
    return getStoredValues(schemaKey);
  };

  const buildVlessPayload = (values: FormState) => {
    const toNumber = (val: unknown) => {
      if (typeof val === "number") return val;
      if (typeof val === "string" && val.trim() !== "") {
        const num = Number(val);
        return Number.isFinite(num) ? num : undefined;
      }
      return undefined;
    };

    const trimString = (val: unknown) => (typeof val === "string" ? val.trim() : "");

    const listenPort = toNumber(values.listen_port);
    const serverName = trimString(values.server_name);
    const flowValue =
      typeof values.flow === "string" && values.flow !== "none" ? values.flow : undefined;
    const shortIds =
      typeof values.short_id === "string" && values.short_id.trim() !== ""
        ? values.short_id
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
        : [""];

    const payload: Record<string, unknown> = {
      type: "vless",
      tag: trimString(values.tag),
      listen: trimString(values.listen),
      users: [
        {
          uuid: trimString(values.uuid),
          name: trimString(values.name),
          ...(flowValue ? { flow: flowValue } : {}),
        },
      ],
      tls: {
        enabled: Boolean(values.tls),
        server_name: serverName,
        reality: {
          enabled: values.reality === undefined ? true : Boolean(values.reality),
          handshake: {
            server: serverName,
            ...(listenPort !== undefined ? { port: listenPort } : {}),
          },
          private_key: trimString(values.private_key),
          short_id: shortIds,
        },
      },
    };

    if (listenPort !== undefined) {
      payload.listen_port = listenPort;
    }

    return payload;
  };

  const buildPayload = (schema: ProtocolSchema, values: FormState) => {
    if (schema.key === "vless") {
      return buildVlessPayload(values);
    }

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

      // 表单层校验：VLESS 用原始字段，其它协议使用转换后的 payload
      const parseTarget = schema.key === "vless" ? values : payload;
      const formParse = schema.zodShape.safeParse(parseTarget);
      if (!formParse.success) {
        hasError = true;
        const fieldErrors: ErrorState = {};
        formParse.error.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          fieldErrors[path] = issue.message;
        });
        newErrors[key] = fieldErrors;
        return;
      }

      // 导出层校验（仅当提供 output schema 时）
      if (schema.zodOutputShape) {
        const outputParse = schema.zodOutputShape.safeParse(payload);
        if (!outputParse.success) {
          hasError = true;
          const fieldErrors: ErrorState = {};
          outputParse.error.issues.forEach((issue) => {
            const path = issue.path.join(".") || "output";
            fieldErrors[path] = issue.message;
          });
          newErrors[key] = fieldErrors;
          return;
        }
        payloads.push(outputParse.data);
        return;
      }

      payloads.push(formParse.data);
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

  const onCopyJson = async () => {
    if (!jsonOutput) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Copy failed", error);
      setCopied(false);
    }
  };

  const toggleSelection = (key: ProtocolKey) => {
    setSelectedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      return next.length === 0 ? prev : (next as ProtocolKey[]);
    });
  };

  const renderField = (field: FieldDefinition) => {
    const storedValue = getFormValues(activeSchema.key)[field.name];
    const renderLabel = () => (
      <Label htmlFor={`${activeSchema.key}-${field.name}`}>
        {field.label}
        {field.required ? <span className="text-destructive ml-1">*</span> : null}
      </Label>
    );
    const renderError = (fallback?: string, helper?: string) => {
      const message = errors[activeSchema.key]?.[field.name] ?? fallback;
      return (
        <div>
          {message ? <p className="text-xs text-destructive">{message}</p> : null}
          {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
      );
    };

    if (field.type === "checkbox") {
      return (
        <form.Field
          name={field.name as keyof FormState}
          defaultValue={Boolean(storedValue)}
          validators={field.required ? { onChange: (value) => (!value ? "required" : undefined) } : undefined}
        >
          {(fieldApi) => (
            <>
              <div className="flex flex-col gap-2">
                {renderLabel()}
                <div className="h-10 flex items-center justify-between rounded-lg border border-border/70 bg-white/5 px-4">
                  <span className="text-sm font-semibold text-foreground">{field.label}</span>
                  <Switch
                    id={`${activeSchema.key}-${field.name}`}
                    checked={Boolean(fieldApi.state.value)}
                    onCheckedChange={(checked) => fieldApi.setValue(checked)}
                  />
                </div>

                {renderError(fieldApi.state.meta.errors?.[0], field.helper)}
              </div>
            </>
          )}
        </form.Field>
      );
    }

    if (field.type === "textarea") {
      return (
        <form.Field
          name={field.name as keyof FormState}
          defaultValue={typeof storedValue === "string" ? storedValue : ""}
          validators={field.required ? { onChange: (value) => (!value ? "必填" : undefined) } : undefined}
        >
          {(fieldApi) => (
            <div className="flex flex-col gap-2">
              {renderLabel()}
              <Textarea
                id={`${activeSchema.key}-${field.name}`}
                placeholder={field.placeholder}
                value={typeof fieldApi.state.value === "string" ? fieldApi.state.value : ""}
                onChange={(e) => fieldApi.handleChange(e.target.value)}
                onBlur={fieldApi.handleBlur}
              />

              {renderError(fieldApi.state.meta.errors?.[0], field.helper)}
            </div>
          )}
        </form.Field>
      );
    }

    if (field.type === "select") {
      return (
        <form.Field
          name={field.name as keyof FormState}
          defaultValue={String(storedValue ?? "")}
          validators={field.required ? { onChange: (value) => (!value ? "必选" : undefined) } : undefined}
        >
          {(fieldApi) => (
            <div className="flex flex-col gap-2">
              {renderLabel()}
              <Select
                id={`${activeSchema.key}-${field.name}`}
                value={String(fieldApi.state.value ?? "")}
                onChange={(e) => fieldApi.handleChange(e.target.value)}
                onBlur={fieldApi.handleBlur}
              >
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>

              {renderError(fieldApi.state.meta.errors?.[0], field.helper)}
            </div>
          )}
        </form.Field>
      );
    }

    if (field.name === "uuid") {
      return (
        <form.Field
          name={field.name as keyof FormState}
          defaultValue={typeof storedValue === "string" ? storedValue : ""}
          validators={{ onChange: (value) => (!value ? "必填" : undefined) }}
        >
          {(fieldApi) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {renderLabel()}
                <button
                  type="button"
                  onClick={() => {
                    const uuid = UUID.generate();
                    fieldApi.setValue(uuid);
                  }}
                  className="h-4 rounded-md px-3 text-xs font-semibold transition-colors bg-primary/10 text-primary hover:bg-primary/20"
                >
                  Create UUID
                </button>
              </div>
              <Input
                id={`${activeSchema.key}-${field.name}`}
                type={field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                value={typeof fieldApi.state.value === "string" ? fieldApi.state.value : ""}
                min={field.min}
                max={field.max}
                onChange={(e) => fieldApi.handleChange(e.target.value)}
                onBlur={fieldApi.handleBlur}
              />
              {renderError(fieldApi.state.meta.errors?.[0], field.helper)}
            </div>
          )}
        </form.Field>
      );
    }

    return (
      <form.Field
        name={field.name as keyof FormState}
        defaultValue={typeof storedValue === "string" ? storedValue : ""}
        validators={field.required ? { onChange: (value) => (!value ? "必填" : undefined) } : undefined}
      >
        {(fieldApi) => (
          <div className="flex flex-col gap-2">
            {renderLabel()}
            <Input
              id={`${activeSchema.key}-${field.name}`}
              type={field.type === "number" ? "number" : "text"}
              placeholder={field.placeholder}
              value={typeof fieldApi.state.value === "string" ? fieldApi.state.value : ""}
              min={field.min}
              max={field.max}
              onChange={(e) => fieldApi.handleChange(e.target.value)}
              onBlur={fieldApi.handleBlur}
            />
            {renderError(fieldApi.state.meta.errors?.[0], field.helper)}
          </div>
        )}
      </form.Field>
    );
  };

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 via-white/2 to-white/0 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.9)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent" className="animate-pulse-soft">
            JSON & QR batch
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Sparkles size={18} />
            Sing-box Config to JSON Toolkit
          </div>
          <p className="text-base text-muted-foreground max-w-3xl">
            Serialize to JSON or QR in one go.
            配置状态自动保存在本地，无需登录。
          </p>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1.5fr)_340px]">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Protocols</CardTitle>
            <CardDescription>Multi-select for batch JSON/QR export.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col py-2">
            <ScrollArea className="flex-1 space-y-3 w-full p-2">
              {protocolSchemas.map((schema) => {
                const selected = selectedKeys.includes(schema.key);
                const schemaErrors = errors[schema.key];
                return (
                  <button
                    key={schema.key}
                    type="button"
                    onClick={() => setActiveKey(schema.key)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors flex flex-col items-start gap-3",
                      selected ? "!border-primary/40 " : '',
                      activeKey === schema.key
                        ? "border-primary/80 bg-primary/10 text-foreground shadow-sm"
                        : "border-border/70 bg-white/5 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <div className="w-full flex justify-between space-x-4 items-center">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(schema.key);
                        }}
                        className={cn(
                          "mt-[2px] h-3 w-3 rounded-full border transition-colors",
                          selected
                            ? "border-primary/70 bg-primary/40 shadow-[0_0_0_3px_rgba(127,245,197,0.15)]"
                            : "border-border/80 bg-white/10",
                        )}
                      />

                      <div className="flex-1 pr-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{schema.label}</span>
                          <span className="text-xs text-muted-foreground">{schema.fields.length} fields</span>
                        </div>
                        {schemaErrors ? (
                          <p className="mt-1 text-xs text-destructive">Has validation issues</p>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="mt-1 text-xs text-muted-foreground">{schema.description}</p>
                    </div>
                  </button>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activeSchema.label}</CardTitle>
                <CardDescription>{activeSchema.description}</CardDescription>
              </div>
              <Badge variant="outline">{activeSchema.fields.length} fields</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-5 overflow-auto">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 p-5">
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


            {submitted ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 size={16} />
                Form submitted (payload serialized below).
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              <Badge variant="accent" className="gap-1">
                Live
                <ArrowRight size={14} />
                JSON/QR
              </Badge>
            </div>

            <CardDescription>Serialized JSON plus QR for scanning.</CardDescription>
            <div className="flex flex-wrap justify-between gap-2">
              <Button onClick={onGenerateJson} className="gap-1">
                <Sparkles size={8} />
                Generate JSON
              </Button>
              <Button variant="secondary" onClick={onGenerateQr} className="gap-1">
                <QrCode size={8} />
                Generate QR
              </Button>
              {/* <Button variant="ghost" onClick={onSubmit} className="gap-2">
                <Send size={16} />
                Submit
              </Button> */}
            </div>

          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 overflow-auto px-5">
            <div className="flex items-center justify-between ">
              <p className="text-xs text-muted-foreground">JSON preview</p>
              <Button variant="ghost" size="sm" className="gap-2" onClick={onCopyJson} disabled={!jsonOutput}>
                <Copy size={14} />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
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
