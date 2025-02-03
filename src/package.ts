// https://docs.npmjs.com/files/package.json
export type IPackageJsonDependencyTypes =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = Record<string, JsonPrimitive | JsonPrimitive[]>;

export interface PackageJsonAddress {
  url?: string;
  email?: string;
}

export interface PackageJsonPerson extends PackageJsonAddress {
  name: string;
}

export interface PackageJsonUrl {
  type: string;
  url: string;
}

export interface PackageJsonRepository extends PackageJsonUrl {
  directory?: string;
}

export interface PackageJsonExport {
  type?: string;
  default?: string;
}

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  bugs?: PackageJsonAddress;
  license?: string;
  author?: string | PackageJsonPerson;
  contributors?: string[] | PackageJsonPerson[];
  funding?: string | PackageJsonUrl | Array<string | PackageJsonUrl>;
  files?: string[];
  type?: "commonjs" | "module";
  packageManager: string;
  exports?: Record<
    string,
    | string
    | {
        import: string | PackageJsonExport;
        require: string | PackageJsonExport;
      }
  >;
  imports?: Record<string, string | Record<string, string>>;
  main?: string;
  module?: string; // Yarn 2+
  browser?: string;
  types?: string; // TypeScript
  bin?: Record<string, string>;
  man?: string | string[];
  directories?: {
    lib?: string;
    bin?: string;
    man?: string;
    doc?: string;
    example?: string;
    test?: string;
  };
  repository?: string | PackageJsonRepository;
  scripts?: Record<string, string>;
  config?: Record<string, string>;
  dependencies?: Record<string, string>;
  dependenciesMeta?: Record<string, JsonObject>; // Yarn 2+, PNPM
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, JsonObject>;
  optionalDependencies?: Record<string, string>;
  bundledDependencies?: string[];
  overrides?: Record<string, string | Record<string, string>>;
  resolutions?: Record<string, string>; // Yarn 2+, PNPM
  engines?: Record<string, string>;
  os?: string[];
  cpu?: string[];
  libc?: Record<string, string>;
  devEngines?: Record<string, Record<string, string>>;
  private?: boolean;
  publishConfig?: {
    access?: "public" | "restricted";
    bin?: string;
    browser?: string;
    executableFiles: string[];
    main?: string;
    exports: Record<string, string>;
    module?: string;
    registry?: string;
  };
  workspaces?: string[];
}
