# Module Layer Dependencies

This diagram is generated from dependency-cruiser. Update it with `pnpm architecture:graph`; verify it with `pnpm architecture:graph:check`.

```mermaid
flowchart LR

subgraph module_kernel["kernel"]
  node_kernel_public["public"]
  node_kernel_application["application"]
  node_kernel_domain["domain"]
  node_kernel_infrastructure["infrastructure"]
  node_kernel_transport["transport"]
end

subgraph module_refindery["refindery"]
  node_refindery_public["public"]
  node_refindery_application["application"]
  node_refindery_domain["domain"]
  node_refindery_infrastructure["infrastructure"]
  node_refindery_presentation["presentation"]
end

node_kernel_infrastructure --> node_kernel_domain
node_kernel_public --> node_kernel_application
node_kernel_public --> node_kernel_domain
node_kernel_public --> node_kernel_infrastructure
node_kernel_public --> node_kernel_transport
node_kernel_transport --> node_kernel_domain
node_refindery_infrastructure --> node_refindery_domain
node_refindery_presentation --> node_refindery_domain
node_refindery_public --> node_refindery_domain
node_refindery_public --> node_refindery_infrastructure
node_refindery_public --> node_refindery_presentation

linkStyle 1 stroke-dasharray: 1 4
linkStyle 2 stroke-dasharray: 1 4
linkStyle 3 stroke-dasharray: 1 4
linkStyle 4 stroke-dasharray: 6 4
linkStyle 8 stroke-dasharray: 1 4
linkStyle 9 stroke-dasharray: 1 4
linkStyle 10 stroke-dasharray: 1 4
```

## Edge Styles

- Solid edges are static runtime imports.
- Dashed edges are dynamic imports or type-only dependencies.
- Dotted edges are re-export-only dependencies.
