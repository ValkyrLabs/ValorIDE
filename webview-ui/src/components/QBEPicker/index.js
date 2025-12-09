import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import DraggableModal from "@valkyr/component-library/DraggableModal";
import CoolButton from "@valkyr/component-library/CoolButton";
import { BASE_PATH } from "@thor/src";
import { FaPlus } from "react-icons/fa";
export const QBEPicker = ({
  show,
  refType,
  allowCreate = false,
  onCreate,
  onCancel,
  onPick,
}) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState(null);
  const search = async () => {
    setBusy(true);
    setErr(null);
    try {
      const params = [];
      if (q.trim()) params.push(`example=${encodeURIComponent(q.trim())}`);
      const url = `${BASE_PATH}/${refType}${params.length ? `?${params.join("&")}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : (data?.content ?? []));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (show) search();
  }, [show]);
  if (!show) return null;
  return _jsx(DraggableModal, {
    title: `Pick ${refType}`,
    toggle: onCancel,
    showModal: true,
    body: _jsxs("div", {
      style: { width: 560 },
      children: [
        _jsxs("div", {
          style: { display: "flex", gap: 8 },
          children: [
            _jsx("input", {
              className: "form-control",
              placeholder: '{"name":"search"} (JSON example)',
              value: q,
              onChange: (e) => setQ(e.target.value),
            }),
            _jsx(CoolButton, {
              onClick: search,
              disabled: busy,
              children: busy ? "Searching…" : "Search",
            }),
          ],
        }),
        err &&
          _jsxs("div", {
            style: { color: "salmon", marginTop: 6 },
            children: ["Error: ", err],
          }),
        _jsxs("div", {
          style: { maxHeight: 360, overflow: "auto", marginTop: 10 },
          children: [
            results.map((r) =>
              _jsxs(
                "div",
                {
                  className: "ws-palette-item",
                  style: { cursor: "pointer" },
                  onClick: () => onPick(r),
                  children: [
                    _jsx("div", {
                      style: { fontWeight: 600 },
                      children: r.name || r.description || r.id,
                    }),
                    _jsx("div", {
                      style: { fontSize: 12, opacity: 0.7 },
                      children: r.id,
                    }),
                  ],
                },
                r.id || r.keyHash || JSON.stringify(r),
              ),
            ),
            !busy &&
              results.length === 0 &&
              _jsx("div", { style: { opacity: 0.7 }, children: "No results" }),
          ],
        }),
        _jsxs("div", {
          style: { display: "flex", justifyContent: "flex-end", gap: 8 },
          children: [
            allowCreate &&
              _jsxs(CoolButton, {
                variant: "success",
                disabled: creating,
                onClick: async () => {
                  if (!onCreate) return;
                  setCreating(true);
                  setErr(null);
                  try {
                    const created = await onCreate();
                    if (created) onPick(created);
                  } catch (e) {
                    setErr(e?.message || String(e));
                  } finally {
                    setCreating(false);
                  }
                },
                children: [
                  _jsx(FaPlus, { style: { marginRight: 6 } }),
                  "New ",
                  refType,
                ],
              }),
            _jsx(CoolButton, {
              variant: "secondary",
              onClick: onCancel,
              children: "Close",
            }),
          ],
        }),
      ],
    }),
  });
};
export default QBEPicker;
//# sourceMappingURL=index.js.map
