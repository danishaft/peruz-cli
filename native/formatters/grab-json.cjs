function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatBox(box) {
  if (!box) return undefined;
  return {
    width: box.width,
    height: box.height,
    x: box.x,
    y: box.y,
  };
}

function formatElement(element = {}, verbose = {}) {
  const output = {};
  const fields = [
    ["Tag", element.tag],
    ["Id", element.id],
    ["Classes", element.classes],
    ["Role", element.role],
    ["Aria", element.aria],
    ["Text", element.text],
    ["Selector", element.selector],
    ["XPath", element.xpath],
    ["Box", formatBox(element.box)],
    ["Frame", element.frame],
    ["Shadow", element.shadow],
    ["EventListeners", verbose.eventListeners],
  ];

  for (const [key, value] of fields) {
    if (hasValue(value)) output[key] = value;
  }
  return output;
}

function formatPage(page) {
  if (!page) return undefined;
  const output = {};
  const fields = [
    ["URL", page.url],
    ["Title", page.title],
    ["FrameURL", page.frameUrl],
  ];

  for (const [key, value] of fields) {
    if (hasValue(value)) output[key] = value;
  }
  return hasValue(output) ? output : undefined;
}

function formatComponent(component) {
  if (!component) return undefined;
  const output = {};
  const fields = [
    ["Label", component.label || "React"],
    ["Via", component.via],
    ["Stack", component.stack],
    ["Source", component.source],
    ["Props", component.props],
  ];

  for (const [key, value] of fields) {
    if (hasValue(value)) output[key] = value;
  }
  return hasValue(output) ? output : undefined;
}

function formatAncestors(ancestors = []) {
  if (!Array.isArray(ancestors) || ancestors.length === 0) return undefined;
  return ancestors.map((ancestor, index) => ({
    Index: index + 1,
    Html: ancestor.html,
    Indent: ancestor.indent || 0,
    Grabbed: ancestor.grabbed === true,
  }));
}

function formatGrabJson(bundle, options = {}) {
  const number = options.number || bundle.number || 1;
  const output = {
    Number: number,
  };

  const page = formatPage(bundle.page);
  if (page) output.Page = page;

  output.Element = formatElement(bundle.element, bundle.verbose || {});

  const component = formatComponent(bundle.component);
  if (component) output.Component = component;

  if (hasValue(bundle.styles)) output.Styles = bundle.styles;

  const ancestors = formatAncestors(bundle.ancestors);
  if (ancestors) output.Ancestors = ancestors;

  const screenshotPath = options.screenshotPath || bundle.screenshotPath;
  if (screenshotPath) output.Screenshot = screenshotPath;

  return output;
}

module.exports = {
  formatGrabJson,
};
