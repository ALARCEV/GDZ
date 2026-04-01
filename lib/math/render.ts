import katex from "katex";

export function renderMathToHtml(expression: string): string {
  return katex.renderToString(expression, {
    throwOnError: false,
    output: "html"
  });
}
