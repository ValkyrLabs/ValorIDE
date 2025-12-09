import React, { useEffect, useState } from "react";
import DraggableModal from "@valkyr/component-library/DraggableModal";
import CoolButton from "@valkyr/component-library/CoolButton";
import { BASE_PATH } from "@thor/src";
import { FaPlus } from "react-icons/fa";

export type QBERecord = {
  id?: string;
  name?: string;
  description?: string;
  label?: string;
  [k: string]: any;
};

export const QBEPicker: React.FC<{
  show: boolean;
  refType: string; // server resource path e.g. Workflow, Principal
  allowCreate?: boolean;
  onCreate?: () => Promise<QBERecord | null>;
  onCancel: () => void;
  onPick: (value: QBERecord | null) => void;
}> = ({ show, refType, allowCreate = false, onCreate, onCancel, onPick }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<QBERecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = async () => {
    setBusy(true);
    setErr(null);
    try {
      const params: string[] = [];
      if (q.trim()) params.push(`example=${encodeURIComponent(q.trim())}`);
      const url = `${BASE_PATH}/${refType}${params.length ? `?${params.join("&")}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : (data?.content ?? []));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (show) search();
  }, [show]);

  if (!show) return null;

  return (
    <DraggableModal
      title={`Pick ${refType}`}
      toggle={onCancel}
      showModal={true}
      body={
        <div style={{ width: 560 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-control"
              placeholder='{"name":"search"} (JSON example)'
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <CoolButton onClick={search} disabled={busy}>
              {busy ? "Searching…" : "Search"}
            </CoolButton>
          </div>
          {err && (
            <div style={{ color: "salmon", marginTop: 6 }}>Error: {err}</div>
          )}
          <div style={{ maxHeight: 360, overflow: "auto", marginTop: 10 }}>
            {results.map((r) => (
              <div
                key={r.id || r.keyHash || JSON.stringify(r)}
                className="ws-palette-item"
                style={{ cursor: "pointer" }}
                onClick={() => onPick(r)}
              >
                <div style={{ fontWeight: 600 }}>
                  {r.name || r.description || r.id}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{r.id}</div>
              </div>
            ))}
            {!busy && results.length === 0 && (
              <div style={{ opacity: 0.7 }}>No results</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {allowCreate && (
              <CoolButton
                variant="success"
                disabled={creating}
                onClick={async () => {
                  if (!onCreate) return;
                  setCreating(true);
                  setErr(null);
                  try {
                    const created = await onCreate();
                    if (created) onPick(created);
                  } catch (e: any) {
                    setErr(e?.message || String(e));
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                <FaPlus style={{ marginRight: 6 }} />
                New {refType}
              </CoolButton>
            )}
            <CoolButton variant="secondary" onClick={onCancel}>
              Close
            </CoolButton>
          </div>
        </div>
      }
    />
  );
};

export default QBEPicker;
