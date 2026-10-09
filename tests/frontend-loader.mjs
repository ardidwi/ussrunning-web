import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript");
export function loader(overrides = {}) {
  const modules = new Map();
  function load(file) {
    file = resolve(file);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const localRequire = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier === "server-only") return {};
      if (specifier.startsWith("@/"))
        return load(resolve(specifier.slice(2) + ".ts"));
      if (specifier.startsWith("."))
        return load(resolve(dirname(file), specifier + ".ts"));
      return require(specifier);
    };
    vm.runInThisContext("(function(require,module,exports){" + code + "\n})", {
      filename: file,
    })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}
