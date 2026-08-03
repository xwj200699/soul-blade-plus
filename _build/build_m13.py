# -*- coding: utf-8 -*-
"""Build 刀魂PLUS-M1.2-优化版.html (single file).

M1.2 vs M1.1:
  - UI 资产全面切换到自产 assets/uilib(artlib 青铜·雷紋体系);
    原项目 assets/ui-lab 整目录不再打包(去 copy 性 + 瘦身)
  - favicon 使用 uilib 自产璧徽
  - 其余同 M1.1: resolveEmbeddedAsset shim / 未内嵌 assets 请求拦截
"""
import base64
import json
import mimetypes
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = r"C:\留存\Game Now\soul-blade-plus"
OUT = os.path.join(ROOT, "发布", "血刃-M1.3-闯关版.html")  # M1.2 更名: 血刃 CRIMSON EDGE

mimetypes.add_type("font/ttf", ".ttf")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("image/webp", ".webp")


def data_url(path):
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


assets = {}
dropped_uilab = 0
for dirpath, _, files in os.walk(os.path.join(ROOT, "assets")):
    for fn in files:
        p = os.path.join(dirpath, fn)
        key = os.path.relpath(p, ROOT).replace("\\", "/")
        if key.startswith("assets/ui-lab/") or key == "assets/favicon.png":
            dropped_uilab += 1  # M1.2: 原项目 UI 素材(含 favicon)整体剔除
            continue
        assets[key] = data_url(p)
print(f"embedded: {len(assets)} · ui-lab dropped entirely: {dropped_uilab}")

# css with fonts inlined
css = open(os.path.join(ROOT, "css", "style.css"), encoding="utf-8").read()
css2 = re.sub(r"url\(([^)]+)\)",
              lambda m: f"url({assets.get(m.group(1).strip(chr(39) + chr(34)).lstrip('./'), m.group(1))})",
              css)
assert "url(assets" not in css2.replace("url(data:", ""), "css url not inlined"

idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
order = re.findall(r'<script src="js/([a-z0-9]+)\.js', idx)
print("modules:", order)
js_blobs = [(n, open(os.path.join(ROOT, "js", f"{n}.js"), encoding="utf-8").read().replace("</script>", "<\\/script>"))
            for n in order]

shim = r"""
/* ===== M1 single-file shim: unified embedded-asset resolver ===== */
'use strict';
window.resolveEmbeddedAsset = function (input) {
  let key = String(input).split('?')[0].split('#')[0];
  try { key = new URL(key, location.href).pathname; } catch (e) {}
  key = key.replace(/\\/g, '/');
  const ai = key.lastIndexOf('/assets/');
  if (ai >= 0) key = key.slice(ai + 1);
  key = key.replace(/^\/+/, '');
  try { key = decodeURIComponent(key); } catch (e) {}
  const A = window.ASSETS_B64;
  return A[key]
      || A[key.replace(/\.webp$/i, '.png')]
      || A[key.replace(/\.png$/i, '.webp')]
      || null;
};
const __isAssetPath = u => /(^|\/)assets\//.test(String(u).split('?')[0]);
const __NativeImage = window.Image;
window.Image = function Image() {
  const img = new __NativeImage();
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(img, 'src', {
    set(v) {
      const hit = window.resolveEmbeddedAsset(v);
      if (hit) { desc.set.call(img, hit); return; }
      if (__isAssetPath(v)) {  // embedded-only build: never touch the network
        console.warn('[assets] not embedded:', v);
        setTimeout(() => img.onerror && img.onerror(new Error('not embedded: ' + v)), 0);
        return;
      }
      desc.set.call(img, v);
    },
    get() { return desc.get.call(img); },
    configurable: true,
  });
  return img;
};
window.Image.prototype = __NativeImage.prototype;
const __nativeFetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = function (url, ...args) {
  const hit = window.resolveEmbeddedAsset(url);
  if (hit && __nativeFetch) return __nativeFetch(hit);
  if (__isAssetPath(url)) {
    console.warn('[assets] fetch not embedded:', url);
    return Promise.reject(new Error('not embedded: ' + url));
  }
  return __nativeFetch ? __nativeFetch(url, ...args) : Promise.reject(new Error('no fetch'));
};
"""

parts = [f"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>血刃 CRIMSON EDGE · M1.3 闯关版</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" href="{assets.get('assets/uilib/favicon.png', assets.get('assets/favicon.png', ''))}">
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
"""]
keys = sorted(assets.keys())
for i in range(0, len(keys), 12):
    seg = {k: assets[k] for k in keys[i:i + 12]}
    parts.append(f"<script>Object.assign(window.ASSETS_B64, {json.dumps(seg)});</script>\n")
parts.append(f"<script>\n{shim}\n</script>\n")
for name, src in js_blobs:
    parts.append(f"<script>/* ===== js/{name}.js ===== */\n{src}\n</script>\n")
parts.append("</body>\n</html>\n")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("".join(parts))
print(f"wrote {OUT}: {os.path.getsize(OUT) / 1048576:.1f} MB")
