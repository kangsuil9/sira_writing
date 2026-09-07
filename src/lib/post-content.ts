import sanitizeHtml from "sanitize-html";

export function sanitizePostHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "div",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "blockquote",
      "font",
      "img",
    ],
    allowedAttributes: {
      p: ["style"],
      div: ["style"],
      font: ["size"],
      img: ["src", "alt"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
      },
    },
    allowedSchemes: ["https"],
  });
}
