import { describe, expect, it } from "vitest";
import { parseAnimeId, synopsisText } from "../../src/routes/anime.$id";

describe("parseAnimeId", () => {
  it("parses positive integer strings", () => {
    expect(parseAnimeId("21")).toBe(21);
    expect(parseAnimeId("1")).toBe(1);
    expect(parseAnimeId("154958")).toBe(154958);
  });

  it("rejects non-positive integers", () => {
    expect(parseAnimeId("0")).toBeNull();
    expect(parseAnimeId("-3")).toBeNull();
  });

  it("rejects non-integers and non-numeric strings", () => {
    expect(parseAnimeId("12.5")).toBeNull();
    expect(parseAnimeId("frieren")).toBeNull();
    expect(parseAnimeId("")).toBeNull();
    expect(parseAnimeId("21abc")).toBeNull();
  });
});

describe("synopsisText", () => {
  it("converts <br> tags to newlines", () => {
    expect(synopsisText("Line one<br>Line two")).toBe("Line one\nLine two");
    expect(synopsisText("Line one<br/>Line two")).toBe("Line one\nLine two");
    expect(synopsisText("Line one<br />Line two")).toBe("Line one\nLine two");
  });

  it("converts paragraph closes to blank lines", () => {
    expect(synopsisText("<p>First.</p><p>Second.</p>")).toBe("First.\n\nSecond.");
  });

  it("strips inline markup", () => {
    expect(synopsisText("A <i>great</i> show")).toBe("A great show");
    expect(synopsisText("<b>Bold</b> &amp; <em>italic</em>")).toBe("Bold & italic");
  });

  it("decodes HTML entities", () => {
    expect(synopsisText("&quot;quoted&quot;")).toBe('"quoted"');
    expect(synopsisText("&#039;apostrophe&#039;")).toBe("'apostrophe'");
    expect(synopsisText("&apos;apos&apos;")).toBe("'apos'");
    expect(synopsisText("&lt;tag&gt;")).toBe("<tag>");
    expect(synopsisText("a&nbsp;b")).toBe("a b");
  });

  it("trims surrounding whitespace", () => {
    expect(synopsisText("  <p>  Hello.  </p>  ")).toBe("Hello.");
  });
});
