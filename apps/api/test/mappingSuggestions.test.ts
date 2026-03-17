import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMatchText,
  rankMappingSuggestions,
  scoreMatch
} from "../src/lib/mappingSuggestions";

test("normalizeMatchText removes accents and punctuation", () => {
  const normalized = normalizeMatchText("KARAKILÇIK, Köy Tarhanası!");
  assert.equal(normalized, "karakilcik koy tarhanasi");
});

test("scoreMatch gives high score for similar names", () => {
  const score = scoreMatch("Karakilcik Koy Tarhanasi", "Karakılçık Köy Tarhanası");
  assert.ok(score >= 0.8);
});

test("rankMappingSuggestions returns top candidate with product/variant ids", () => {
  const suggestions = rankMappingSuggestions(
    "Sebzeli Erişte 2 KG",
    [
      {
        localProductId: "p1",
        localVariantId: null,
        label: "Karakilcik Koy Tarhanasi",
        sourceText: "Karakilcik Koy Tarhanasi"
      },
      {
        localProductId: "p2",
        localVariantId: "v2",
        label: "Sebzeli Erişte / 2 KG",
        sourceText: "Sebzeli Eriste 2 KG"
      }
    ],
    3,
    0.2
  );

  assert.equal(suggestions.length > 0, true);
  assert.equal(suggestions[0].localProductId, "p2");
  assert.equal(suggestions[0].localVariantId, "v2");
});
