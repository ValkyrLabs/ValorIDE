/**
 * BootstrapGrid Component
 * High-performance React Bootstrap data grid with inline editing, sorting, pagination
 */

export interface ColumnSchema {
  type?:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "datetime"
    | "enum"
    | "object";
  enumValues?: string[] | number[];
  enumValueType?: "string" | "number";
  refType?: string;
}

export { default as RBGrid } from "./RBGrid";
export type { RBGridProps } from "./RBGrid";
