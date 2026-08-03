# -*- coding: utf-8 -*-
"""Build the single-file edition of SOUL BLADE PLUS.

Inlines: css (with @font-face urls rewritten to data:), all 12 js modules
(in index.html order), and every file under assets/ as base64 data URLs in
an ASSETS_B64 map. A shim script (injected before game code) reroutes
`new Image().src` and `fetch()` through that map — so the whole game runs
from one HTML file over file:// with zero CORS/canvas-taint issues
(data: URLs are same-origin).
"""
import base64
import mimetypes
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = r"C:\留存\Game Now\soul-blade-plus"
OUT = os.path.join(ROOT, "发布", "刀魂PLUS-M0-单文件版.html")

mimetypes.add_type("font/ttf", ".ttf")
mimetypes.add_type("font/woff2", ".woff2")


def data_url(path):
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


# ---------- collect assets ----------
assets = {}
adir = os.path.join(ROOT, "assets")
for dirpath, _, files in os.walk(adir):
    for fn in files:
        p = os.path.join(dirpath, fn)
        key = os.path.relpath(p, ROOT).replace("\\", "/")
        assets[key] = data_url(p)
print(f"assets inlined: {len(assets)}")

# ---------- css with fonts inlined ----------
css = open(os.path.join(ROOT, "css", "style.css"), encoding="utf-8").read()


def css_url(m):
    u = m.group(1).strip("'\"")
    key = u.lstrip("./")
    if not key.startswith("assets/"):
        key = "assets/" + key.split("assets/")[-1] if "assets/" in key else key
    if key.startswith("../"):
        key = key[3:]
    return f"url({assets.get(key, u)})"


css2 = re.sub(r"url\(([^)]+)\)", css_url, css)
# also handle relative ../assets refs
leftover = re.findall(r"url\((?!data:)[^)]*\)", css2)
if leftover:
    print("CSS urls not inlined:", leftover)

# ---------- read index.html for script order ----------
idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
order = re.findall(r'<script src="js/([a-z0-9]+)\.js', idx)
print("script order:", order)

js_blobs = []
for name in order:
    src = open(os.path.join(ROOT, "js", f"{name}.js"), encoding="utf-8").read()
    # safety: no closing script tags inside code
    src = src.replace("</script>", "<\\/script>")
    js_blobs.append((name, src))

# ---------- shim ----------
shim = """
/* single-file shim: reroute Image.src + fetch through the inlined asset map */
'use strict';
const __norm = u => String(u).split('?')[0].replace(/^\\.\\//, '');
const __A = window.ASSETS_B64;
const __NativeImage = window.Image;
window.Image = function Image() {
  const img = new __NativeImage();
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(img, 'src', {
    set(v) { const hit = __A[__norm(v)]; desc.set.call(img, hit || v); },
    get() { return desc.get.call(img); },
    configurable: true,
  });
  return img;
};
window.Image.prototype = __NativeImage.prototype;
const __nativeFetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = function (url, ...args) {
  const hit = __A[__norm(url)];
  if (hit && __nativeFetch) return __nativeFetch(hit);
  if (__nativeFetch) return __nativeFetch(url, ...args);
  return Promise.reject(new Error('no fetch'));
};
"""

# ---------- favicon ----------
fav = assets.get("assets/favicon.png", "")

# ---------- assemble ----------
parts = []
parts.append(f"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>刀魂 SOUL BLADE PLUS · 群英乱斗 单文件版</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" href="{fav}">
<style>
{css2}
</style>
</head>
<body>
<div id="stage">
  <canvas id="game" width="1024" height="576"></canvas>
  <div id="crt"></div>
  <div id="err"></div>
</div>
<script>
window.ASSETS_B64 = {{}};
</script>
""")

# asset map in chunks (avoid one giant line; keep JSON-safe)
import json
keys = sorted(assets.keys())
CHUNK = 12
for i in range(0, len(keys), CHUNK):
    seg = {k: assets[k] for k in keys[i:i + CHUNK]}
    parts.append(f"<script>Object.assign(window.ASSETS_B64, {json.dumps(seg)});</script>\n")

parts.append(f"<script>\n{shim}\n</script>\n")
for name, src in js_blobs:
    parts.append(f"<script>/* ===== js/{name}.js ===== */\n{src}\n</script>\n")
parts.append("</body>\n</html>\n")

html = "".join(parts)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote {OUT}: {os.path.getsize(OUT) / 1048576:.1f} MB")
