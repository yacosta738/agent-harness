import {isMap, isScalar, parseDocument} from "yaml";

export function parseYamlStringScalar(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const document = parseDocument(raw);
  if (document.errors.length || !isScalar(document.contents)) {
    return null;
  }
  const value = document.contents.value;
  return typeof value === "string" ? value : null;
}

export function parseYamlFrontmatter(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const document = parseDocument(raw);
  if (document.errors.length || !isMap(document.contents)) {
    return null;
  }
  const values = Object.create(null);
  for (const pair of document.contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
      continue;
    }
    values[pair.key.value] = isScalar(pair.value) ? pair.value.value : null;
  }
  return values;
}