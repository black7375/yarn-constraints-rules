# yarn-constraints-rules

`yarn-constraints` is a utility library for enforcing dependency constraints
across your Yarn workspaces and external packages, ensuring consistency
and correctness in your project setup.

## Features

- Ensure dependency consistency across workspaces  
- Enforce workspace dependencies using the "workspace:" protocol  
- Forbid specific dependencies in the workspace  
- Enforce allowed dependency version ranges  
- Apply custom fields to all workspaces  
- Ensure peer dependencies are present  

## Installation

```sh
yarn add -D @yarnpkg/types yarn-constraints-rules
```

## Usage

Import the required functions in your project:

```javascript
// @ts-check

// Your `yarn.config.cjs`
const { defineConfig } = require("@yarnpkg/types");
const {
  forbidDependency,
  ensureDependencyConsistency,
  enforceWorkspaceDependenciesWhenPossible,
  enforcePeerDependencyPresence
  enforceDependencyRanges,
  enforceFieldsOnAllWorkspaces,
} = require("yarn-constraints-rules");

module.exports = defineConfig({
  constraints: async (ctx) => {
    forbidDependency(ctx, ["forbid-package-name"]);
    ensureDependencyConsistency(ctx);
    enforceWorkspaceDependenciesWhenPossible(ctx);
    enforcePeerDependencyPresence(ctx);
    enforceDependencyRanges(ctx, {
      "lodash": "^4.17.21",
      "react": "^18.0.0"
    });
    enforceFieldsOnAllWorkspaces(ctx, {
      version: "1.0.0",
      name: (workspace) => `prefix-${workspace.name}`
    });
  }
});
```

## References
- [Yarn Berry Configuration](https://github.com/yarnpkg/berry/blob/master/yarn.config.cjs)
- [yarn-constraints Configuration](https://github.com/fandasson/yarn-constraints/blob/main/yarn.config.cjs)


## License
MIT
