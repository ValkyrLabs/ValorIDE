import React from "react";
import { Form as BSForm } from "react-bootstrap";
import SmartFkPicker from "./SmartFkPicker";

export type SmartFieldProps = {
  name: string;
  value: any;
  error?: string | undefined;
  placeholder?: string;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (field: string, isTouched?: boolean) => void;
};

const METADATA_IDS = new Set([
  "ownerId",
  "lastModifiedById",
  "lastAccessedById",
  "workflowStateId",
  "keyHash",
]);

function inferEntityFromField(name: string): string | null {
  if (!name) return null;
  if (!name.endsWith("Id")) return null;
  if (METADATA_IDS.has(name)) return null;
  const base = name.substring(0, name.length - 2); // remove Id
  if (!base) return null;
  // simple PascalCase
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export const SmartField: React.FC<SmartFieldProps> = ({
  name,
  value,
  error,
  placeholder,
  setFieldValue,
  setFieldTouched,
}) => {
  const targetEntity = inferEntityFromField(name);
  if (targetEntity) {
    return (
      <div>
        <SmartFkPicker
          entity={targetEntity}
          value={value as string | undefined}
          onChange={(id) => {
            setFieldTouched(name, true);
            setFieldValue(name, id);
          }}
          placeholder={placeholder}
        />
      </div>
    );
  }
  return (
    <>
      <BSForm.Control
        name={name}
        type="text"
        value={value ?? ""}
        onChange={(e) => {
          setFieldTouched(name, true);
          setFieldValue(name, (e.target as HTMLInputElement).value);
        }}
      />
    </>
  );
};

export default SmartField;
