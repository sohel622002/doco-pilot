// Post-build step: renders the public Landing page to static HTML and injects it
// into dist/index.html, so search engines and AI crawlers see real content instead
// of an empty <div id="root">. The client still hydrates as a normal SPA on top of
// this (see main.jsx using createRoot) — this only affects what crawlers see in
// view-source, not runtime behavior for real users.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import Landing from "../src/pages/Landing.jsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distIndexPath = resolve(__dirname, "../dist/index.html");

const markup = renderToStaticMarkup(
  React.createElement(
    StaticRouter,
    { location: "/" },
    React.createElement(Landing, null),
  ),
);

const html = readFileSync(distIndexPath, "utf-8");
const injected = html.replace(
  '<div id="root"></div>',
  `<div id="root">${markup}</div>`,
);

if (injected === html) {
  throw new Error(
    'prerender.js: could not find `<div id="root"></div>` in dist/index.html — Landing page was not injected.',
  );
}

writeFileSync(distIndexPath, injected);
console.log("Prerendered Landing page into dist/index.html");
