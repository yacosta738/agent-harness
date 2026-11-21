import {realpathSync, statSync} from "node:fs";
import {isAbsolute, relative, resolve, sep} from "node:path";

export function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function checkBundleFile(root, ref) {
  const target = resolve(root, ref);
  if (!isInside(root, target)) return "outside";
  try {
    const actualTarget = realpathSync(target);
    if (!isInside(realpathSync(root), actualTarget)) return "outside";
    return statSync(actualTarget).isFile() ? true : "not-file";
  } catch {
    return false;
  }
}
