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

export function plainTextFromPostHtml(value: string) {
  return sanitizeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|blockquote)>/gi, "\n"),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
