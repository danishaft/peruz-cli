function quoteText(text) {
  if (!text) return '""';
  const escaped = String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function formatBox(box) {
  if (!box) return "";
  return `${box.width}x${box.height} @ (${box.x}, ${box.y})`;
}

function formatStyleLines(styles = {}, verbose = {}) {
  const ordered = [
    ["color", "color"],
    ["background", "background"],
    ["font", "font"],
    ["padding", "padding"],
    ["border-radius", "border-radius"],
  ];

  const lines = [];
  for (const [field, label] of ordered) {
    if (styles[field]) lines.push(`- ${label}: ${styles[field]}`);
  }
  const computedStyles = verbose.computedStyles || {};
  const computedKeys = Object.keys(computedStyles).sort();
  if (computedKeys.length > 0) {
    lines.push("- computed styles:");
    for (const key of computedKeys) {
      lines.push(`  - ${key}: ${computedStyles[key]}`);
    }
  }
  return lines;
}

function formatComponent(component) {
  if (!component) return [];
  const via = component.via ? ` (${component.label || "React"}, via ${component.via})` : "";
  const lines = [`## Component${via}`];
  if (component.stack) lines.push(`- Stack: ${Array.isArray(component.stack) ? component.stack.join(" -> ") : component.stack}`);
  if (component.source) lines.push(`- Source: ${component.source}`);
  if (component.props) {
    const props = typeof component.props === "string" ? component.props : JSON.stringify(component.props);
    lines.push(`- Props: ${props}`);
  }
  return lines;
}

function formatPage(page) {
  if (!page) return [];
  const lines = [];
  if (page.url) lines.push(`- URL: ${page.url}`);
  if (page.title) lines.push(`- Title: ${page.title}`);
  if (page.frameUrl && page.frameUrl !== page.url) lines.push(`- Frame URL: ${page.frameUrl}`);
  return lines.length > 0 ? ["## Page", ...lines] : [];
}

function formatEventListeners(eventListeners) {
  if (!Array.isArray(eventListeners)) return [];
  if (eventListeners.length === 0) return ["- Event listeners: none"];
  const labels = eventListeners.map((listener) => {
    const type = listener.type || "unknown";
    const flags = [
      listener.useCapture ? "capture" : "",
      listener.passive ? "passive" : "",
      listener.once ? "once" : "",
    ].filter(Boolean);
    const suffix = flags.length > 0 ? ` (${flags.join(", ")})` : "";
    return `${type}${suffix}`;
  });
  return [`- Event listeners: ${labels.join(", ")}`];
}

function formatAncestors(ancestors = [], verbose = {}) {
  if (!Array.isArray(ancestors) || ancestors.length === 0) return [];
  const lines = [`## Ancestors (${ancestors.length})`];
  ancestors.forEach((ancestor, index) => {
    const indent = "  ".repeat(Math.max(0, ancestor.indent || 0));
    const grabbed = ancestor.grabbed ? "          <-- grabbed" : "";
    lines.push(`${index + 1}. ${indent}${ancestor.html}${grabbed}`);
  });
  const siblings = verbose.siblings || {};
  if (siblings.previous) lines.push(`- Previous sibling: ${siblings.previous}`);
  if (siblings.next) lines.push(`- Next sibling: ${siblings.next}`);
  return lines;
}

function formatGrabMarkdown(bundle, options = {}) {
  const number = options.number || bundle.number || 1;
  const grabId = String(number).padStart(3, "0");
  const element = bundle.element || {};
  const lines = [`# peruz-grab #${grabId}`, ""];

  const pageLines = formatPage(bundle.page);
  if (pageLines.length > 0) {
    lines.push(...pageLines, "");
  }

  lines.push("## Element");
  if (element.tag) lines.push(`- Tag: ${element.tag}`);
  if (element.role) lines.push(`- Role: ${element.role}`);
  if (element.text !== undefined) lines.push(`- Text: ${quoteText(element.text)}`);
  if (element.selector) lines.push(`- Selector: ${element.selector}`);
  if (element.xpath) lines.push(`- XPath: ${element.xpath}`);
  if (element.box) lines.push(`- Box: ${formatBox(element.box)}`);
  if (element.frame) lines.push(`- Frame: ${element.frame}`);
  if (element.shadow) lines.push(`- Shadow: ${element.shadow}`);
  lines.push(...formatEventListeners(bundle.verbose?.eventListeners));

  const componentLines = formatComponent(bundle.component);
  if (componentLines.length > 0) {
    lines.push("", ...componentLines);
  }

  const styleLines = formatStyleLines(bundle.styles, bundle.verbose);
  if (styleLines.length > 0) {
    lines.push("", "## Styles", ...styleLines);
  }

  const ancestorLines = formatAncestors(bundle.ancestors, bundle.verbose);
  if (ancestorLines.length > 0) {
    lines.push("", ...ancestorLines);
  }

  const screenshotPath = options.screenshotPath || bundle.screenshotPath;
  if (screenshotPath) {
    lines.push("", "## Screenshot", screenshotPath);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  formatGrabMarkdown,
  formatAncestors,
  formatBox,
  formatPage,
  formatStyleLines,
};
