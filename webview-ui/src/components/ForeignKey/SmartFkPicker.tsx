import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form as BSForm, ListGroup, Spinner } from "react-bootstrap";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { BASE_PATH } from "@thor/src";

export type SmartFkPickerProps = {
  entity: string; // Simple entity name, e.g. "Organization"
  value?: string | null; // UUID value
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}

async function authFetch(input: string, init?: RequestInit) {
  const token = sessionStorage.getItem("jwtToken");
  return fetch(input, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

type Option = { id: string; label: string; raw: any };

function labelFor(o: any): string {
  if (!o) return "";
  const tryFields = ["name", "title", "label", "description", "displayName"];
  for (const f of tryFields) {
    const v = o[f];
    if (v && typeof v === "string") return v as string;
  }
  // Combine a couple if available
  const parts: string[] = [];
  if (o.name) parts.push(o.name);
  if (o.description) parts.push(o.description);
  if (parts.length) return parts.join(" — ");
  return o.id || "";
}

export const SmartFkPicker: React.FC<SmartFkPickerProps> = ({
  entity,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [query, setQuery] = useState<string>("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial value label if provided
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value) {
        setSelected(null);
        return;
      }
      try {
        const res = await authFetch(`${BASE_PATH}/${entity}/${value}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled)
            setSelected({
              id: data.id || value,
              label: labelFor(data),
              raw: data,
            });
        } else {
          if (!cancelled)
            setSelected({ id: String(value), label: String(value), raw: null });
        }
      } catch {
        if (!cancelled)
          setSelected({ id: String(value), label: String(value), raw: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, entity]);

  // Debounced loader
  const doSearch = useMemo(
    () =>
      debounce(async (text: string) => {
        const q = text.trim();
        setLoading(true);
        try {
          let out: Option[] = [];
          if (!q) {
            // Load first page of results for small lookup tables
            const res = await authFetch(
              `${BASE_PATH}/${entity}?page=1&limit=50`,
            );
            if (res.ok) {
              const arr = await res.json();
              out = (arr || []).map((o: any) => ({
                id: o.id,
                label: labelFor(o),
                raw: o,
              }));
            }
          } else if (isUuidLike(q)) {
            const res = await authFetch(`${BASE_PATH}/${entity}/${q}`);
            if (res.ok) {
              const o = await res.json();
              out = [{ id: o.id || q, label: labelFor(o) || q, raw: o }];
            } else {
              // Try global UUID lookup: may return a different type
              try {
                const gl = await authFetch(`${BASE_PATH}/lookup/${q}`);
                if (gl.ok) {
                  const obj = await gl.json();
                  const it = obj?.item;
                  const type = obj?.type;
                  const lbl =
                    (labelFor(it) || q) +
                    (type && type !== entity ? ` [${type}]` : "");
                  out = [{ id: it?.id || q, label: lbl, raw: it }];
                } else {
                  out = [{ id: q, label: q, raw: null }];
                }
              } catch {
                // Allow direct uuid usage even if not resolvable now
                out = [{ id: q, label: q, raw: null }];
              }
            }
          } else {
            // Prefer server-side lookup if available (fuzzy and numeric support)
            try {
              const lu = await authFetch(
                `${BASE_PATH}/lookup/entity/${encodeURIComponent(entity)}?q=${encodeURIComponent(q)}&limit=20`,
              );
              if (lu.ok) {
                const arr = await lu.json();
                out = (arr || []).map((o: any) => ({
                  id: o.id,
                  label: labelFor(o),
                  raw: o,
                }));
              }
            } catch {
              // Fall back to client-side multi-field QBE if lookup endpoint not present
              const fields = ["name", "description", "title", "label"]; // heuristic
              const numberFields = [
                "code",
                "number",
                "amount",
                "price",
                "quantity",
              ]; // numeric heuristic
              const seen = new Map<string, Option>();
              const queries: Record<string, any>[] = [];
              for (const f of fields) queries.push({ [f]: q });
              if (/^-?\d+(?:\.\d+)?$/.test(q)) {
                for (const f of numberFields) queries.push({ [f]: Number(q) });
              }
              for (const exObj of queries) {
                const ex = encodeURIComponent(JSON.stringify(exObj));
                const res = await authFetch(
                  `${BASE_PATH}/${entity}?page=1&limit=20&example=${ex}`,
                );
                if (res.ok) {
                  const arr = await res.json();
                  for (const o of arr || []) {
                    const opt = {
                      id: o.id,
                      label: labelFor(o),
                      raw: o,
                    } as Option;
                    if (!seen.has(opt.id)) seen.set(opt.id, opt);
                  }
                }
              }
              out = Array.from(seen.values());
            }
          }
          setOptions(out);
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 250),
    [entity],
  );

  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSelect = (opt: Option) => {
    setSelected(opt);
    onChange(opt?.id || null);
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <BSForm.Control
        type="text"
        value={selected ? selected.label : query}
        placeholder={placeholder || `Search ${entity}...`}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
        }}
        onPaste={(e) => {
          const text = (
            e.clipboardData || (window as any).clipboardData
          ).getData("text");
          if (isUuidLike(text)) {
            e.preventDefault();
            setQuery(text);
            // select immediately if desired
          }
        }}
        size="sm"
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#222",
            border: "1px solid #444",
            zIndex: 50,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          {loading && (
            <div className="text-center p-2">
              <Spinner animation="border" size="sm" />
            </div>
          )}
          {!loading && (
            <ListGroup variant="flush">
              {options.map((opt) => (
                <ListGroup.Item
                  key={opt.id}
                  action
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {opt.id}
                  </div>
                </ListGroup.Item>
              ))}
              {options.length === 0 && (
                <ListGroup.Item className="text-muted">
                  No matches
                </ListGroup.Item>
              )}
            </ListGroup>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartFkPicker;
