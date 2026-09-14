#!/usr/bin/env node
/**
 * Render whitepaper.html → PDF, then stamp "NN / TT" page numbers.
 * Run Chrome as a standalone process (sandbox-friendly compounds may skip Chrome writes).
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "whitepaper.html");
const outPdf = path.join(__dirname, "../FreezeWire_Whitepaper.pdf");
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pyCandidates = [
  process.env.PYMUPDF_PYTHON,
  "/tmp/fw-pdf-venv/bin/python",
  "python3",
].filter(Boolean);
const py = pyCandidates.find((p) => p === "python3" || fs.existsSync(p)) || "python3";

const htmlUrl = pathToFileURL(htmlPath).href;
const tmp = outPdf + ".tmp.pdf";

console.log("Printing", htmlUrl);
const r = spawnSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--font-render-hinting=none",
    `--print-to-pdf=${tmp}`,
    htmlUrl,
  ],
  { encoding: "utf8" }
);
if (r.status !== 0 || !fs.existsSync(tmp)) {
  console.error(r.stderr || r.stdout || "Chrome print-to-pdf failed");
  process.exit(1);
}
fs.renameSync(tmp, outPdf);

const stamp = `
import sys
import pymupdf as fitz
path = sys.argv[1]
doc = fitz.open(path)
n = doc.page_count
mm = 72 / 25.4
for i, page in enumerate(doc, start=1):
    label = f"{i:02d} / {n:02d}"
    fontsize = 8
    tw = fitz.get_text_length(label, fontname="cour", fontsize=fontsize)
    x = page.rect.width - 20 * mm - tw
    y = page.rect.height - 10 * mm
    page.insert_text((x, y), label, fontsize=fontsize, fontname="cour", color=(0.60, 0.60, 0.58))
tmp = path + ".stamped.pdf"
doc.save(tmp)
doc.close()
import os
os.replace(tmp, path)
print(n)
`;

const s = spawnSync(py, ["-c", stamp, outPdf], { encoding: "utf8" });
if (s.status !== 0) {
  console.error(s.stderr || s.stdout);
  process.exit(1);
}
console.log(`Wrote ${outPdf} (${String(s.stdout).trim()} pages)`);
