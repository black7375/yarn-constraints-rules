import deepmerge from "@fastify/deepmerge";
import type { Yarn } from "@yarnpkg/types";
import type { PackageJson } from "./package";

// Reference:
// https://github.com/yarnpkg/berry/blob/master/yarn.config.cjs
// https://github.com/fandasson/yarn-constraints/blob/main/yarn.config.cjs
export type Context = Yarn.Constraints.Context;
export type Workspace = Yarn.Constraints.Workspace;
export type Dependency = Yarn.Constraints.Dependency;

export type PackageList = Array<string>;

type DependencyOption = {
  [K in Yarn.Constraints.DependencyType]?: boolean;
};

interface DependencyConsistencyOptions {
  ignorePackages?: PackageList;
  workspace?: DependencyOption;
  external?: DependencyOption;
}

const deepmergeObject = deepmerge();

/**
 * Ensures that dependencies across the workspace and external packages are consistent
 * according to the specified options.
 *
 * @param context - The context object containing the Yarn instance.
 * @param options - Optional configuration for dependency consistency.
 *
 * @remarks
 * The function merges the provided options with the default options and iterates
 * through the dependencies to ensure they are consistent based on the target policy.
 * Dependencies can be ignored by specifying them in the `ignorePackages` array.
 */
export function ensureDependencyConsistency(
  { Yarn }: Context,
  options: DependencyConsistencyOptions = {}
) {
  const defaultOptions: DependencyConsistencyOptions = {
    ignorePackages: [],
    workspace: {
      dependencies: true,
      devDependencies: false,
      peerDependencies: false,
    },
    external: {
      dependencies: true,
      devDependencies: true,
      peerDependencies: false,
    },
  };

  const config = deepmergeObject(defaultOptions, options);
  const EXCLUDED_DEPENDENCIES = new Set(config.ignorePackages);

  for (const dependency of Yarn.dependencies()) {
    if (EXCLUDED_DEPENDENCIES.has(dependency.workspace.cwd)) {
      continue;
    }

    const isWorkspacePkg = Yarn.workspace({ ident: dependency.ident });
    const targetPolicy = (
      isWorkspacePkg ? config.workspace : config.external
    ) as DependencyOption;
    if (!targetPolicy[dependency.type]) {
      continue;
    }

    for (const otherDependency of Yarn.dependencies({
      ident: dependency.ident,
    })) {
      if (EXCLUDED_DEPENDENCIES.has(otherDependency.workspace.cwd)) {
        continue;
      }

      const isOtherWorkspacePkg = Yarn.workspace({
        ident: otherDependency.ident,
      });
      const otherTargetPolicy = (
        isOtherWorkspacePkg ? config.workspace : config.external
      ) as DependencyOption;
      if (!otherTargetPolicy[otherDependency.type]) {
        continue;
      }

      dependency.update(otherDependency.range);
    }
  }
}

/**
 * Enforces workspace dependencies when possible by updating dependencies to use workspace protocol.
 *
 * @param context - The context object containing Yarn.
 * @param ignorePackages - A list of package names to ignore when enforcing workspace dependencies.
 */
export function enforceWorkspaceDependenciesWhenPossible(
  { Yarn }: Context,
  ignorePackages: PackageList = []
) {
  const EXCLUDED_DEPENDENCIES = new Set(ignorePackages);

  for (const dependency of Yarn.dependencies()) {
    if (EXCLUDED_DEPENDENCIES.has(dependency.workspace.cwd)) continue;

    if (!Yarn.workspace({ ident: dependency.ident })) continue;

    dependency.update("workspace:^");
  }
}

/**
 * Forbids specified packages from being dependencies in the Yarn workspace.
 *
 * @param {Context} param0 - The context object containing Yarn.
 * @param {PackageList} [forbidPackages=[]] - The list of package names to forbid as dependencies.
 */
export function forbidDependency(
  { Yarn }: Context,
  forbidPackages: PackageList = []
) {
  for (const forbidPackage of forbidPackages) {
    for (const dependency of Yarn.dependencies({ ident: forbidPackage })) {
      dependency.error(
        `This workspace is forbidden to depend on ${forbidPackage}`
      );
      dependency.delete();
    }
  }
}

/**
 * Enforces the specified dependency ranges for the given Yarn context.
 *
 * @param context - The context object containing the Yarn instance.
 * @param allowedRanges - A record of dependency names and their allowed version ranges.
 *
 * @example
 * ```typescript
 * const context = { Yarn: yarnInstance };
 * const allowedRanges = {
 *   "lodash": "^4.17.21",
 *   "react": "^17.0.2"
 * };
 * enforceDependencyRanges(context, allowedRanges);
 * ```
 */
export function enforceDependencyRanges(
  { Yarn }: Context,
  allowedRanges: Record<string, string>
) {
  const rangesMap = new Map(Object.entries(allowedRanges));

  rangesMap.forEach((range, dependency) => {
    for (const dep of Yarn.dependencies({ ident: dependency })) {
      dep.update(range);
    }
  });
}

/**
 * Enforces specific fields on all workspaces within a Yarn project.
 *
 * @param context - The context object containing Yarn.
 * @param fields - A record where the key is the field name and the value is either a string or a function
 *                 that takes a workspace and returns a value to set for that field.
 *
 * @example
 * ```typescript
 * enforceFieldsOnAllWorkspaces({ Yarn }, {
 *   version: "1.0.0",
 *   name: (workspace) => `prefix-${workspace.name}`
 * });
 * ```
 */
export function enforceFieldsOnAllWorkspaces(
  { Yarn }: Context,
  fields: {
    [K in keyof PackageJson]?:
      | PackageJson[K]
      | ((workspace: Workspace) => PackageJson[K]);
  }
) {
  for (const workspace of Yarn.workspaces()) {
    for (const [field, value] of Object.entries(fields)) {
      workspace.set(
        field,
        typeof value === "function" ? value(workspace) : value
      );
    }
  }
}

/**
 * Enforces the presence of peer dependencies in Yarn workspaces.
 *
 * This function iterates over all dependencies in each Yarn workspace and ensures that
 * all peer dependencies are present. If a peer dependency is missing, it will be added
 * to either `devDependencies` or `dependencies` based on the context.
 *
 * @param context - The context object containing the Yarn instance.
 * @param ignorePackages - An optional list of package names to ignore when enforcing peer dependencies.
 */
export function enforcePeerDependencyPresence(
  { Yarn }: Context,
  ignorePackages: PackageList = []
) {
  const EXCLUDED_DEPENDENCIES = new Set(ignorePackages);

  for (const workspace of Yarn.workspaces()) {
    for (const dependency of Yarn.dependencies({ workspace })) {
      if (dependency.type === "peerDependencies") continue;

      if (!dependency.resolution) continue;

      for (const peerName of dependency.resolution.peerDependencies.keys()) {
        if (EXCLUDED_DEPENDENCIES.has(peerName)) continue;

        if (dependency.resolution.dependencies.has(peerName)) continue;

        const otherDeps = Yarn.dependencies({ ident: peerName }).filter(
          (otherDep) => otherDep.type !== "peerDependencies"
        );

        if (otherDeps.length === 0)
          workspace.error(
            `Missing dependency on ${peerName} (required by ${dependency.ident})`
          );

        // If the workspace has itself a peer dependency of the same name, then
        // we assume that it'll be fulfilled by its ancestors in the dependency
        // tree, so we only need to add the dependency to devDependencies.
        const autofixTarget = Yarn.dependency({
          workspace,
          ident: peerName,
          type: "peerDependencies",
        })
          ? "devDependencies"
          : "dependencies";

        for (const otherDep of otherDeps) {
          workspace.set([autofixTarget, peerName], otherDep.range);
        }
      }
    }
  }
}
