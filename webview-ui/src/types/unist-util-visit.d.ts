declare module "unist-util-visit" {
  type Test = string | ((node: any) => boolean);
  type Visitor = (node: any, index?: number, parent?: any) => void;

  export function visit(tree: any, visitor: Visitor): void;
  export function visit(tree: any, test: Test, visitor: Visitor): void;
}
