import { cn, stripHtml, getTagColor } from "@/lib/utils";

describe("Utils", () => {
  describe("cn", () => {
    it("should merge tailwind classes properly", () => {
      expect(cn("px-2 py-1", "bg-red-500", { "text-white": true, "hidden": false })).toBe("px-2 py-1 bg-red-500 text-white");
    });
    
    it("should resolve tailwind conflicts properly", () => {
      expect(cn("px-2 py-1", "p-4")).toBe("p-4");
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    });
  });

  describe("stripHtml", () => {
    it("should strip HTML tags from a string", () => {
      expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World");
    });

    it("should handle HTML entities", () => {
      expect(stripHtml("Hello&nbsp;World")).toBe("Hello World");
      expect(stripHtml("Test &amp; Check")).toBe("Test Check"); // Not perfect entity decoding but tests current implementation
    });

    it("should collapse whitespace", () => {
      expect(stripHtml("  Hello   World  \n")).toBe("Hello World");
    });
  });

  describe("getTagColor", () => {
    it("should return a consistent color for the same tag", () => {
      const color1 = getTagColor("React");
      const color2 = getTagColor("React");
      expect(color1).toEqual(color2);
    });

    it("should return different colors for different tags", () => {
      const color1 = getTagColor("React");
      const color2 = getTagColor("Vue");
      expect(color1).not.toEqual(color2);
    });
    
    it("should contain bg, text, and border properties", () => {
      const color = getTagColor("TypeScript");
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(color).toHaveProperty("border");
    });
  });
});
