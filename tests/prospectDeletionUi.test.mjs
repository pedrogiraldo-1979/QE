import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prospectDeletionPages = [
  "src/app/prospectos/limpieza/page.tsx",
  "src/app/prospectos/[listId]/page.tsx",
];

test("las pantallas de prospectos no invocan el borrado duro", async () => {
  const sources = await Promise.all(prospectDeletionPages.map((page) => readFile(page, "utf8")));

  for (const source of sources) {
    assert.doesNotMatch(source, /delete_prospect/);
    assert.doesNotMatch(source, /\.delete\s*\(/);
  }
});
