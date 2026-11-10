import { describe, expect, it } from "vitest";
import { cases, renderHtml } from "./fixtures/template-cases.js";

describe("template markup snapshots", () => {
  for (const [tag, list] of Object.entries(cases)) {
    describe(tag, () => {
      for (const testCase of list) {
        it(testCase.name, () => {
          expect(renderHtml(tag, testCase)).toMatchSnapshot();
        });
      }
    });
  }
});
