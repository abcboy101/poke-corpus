import json
import os

# manifest.json
with open("dist/manifest.json", "r", encoding="utf-8") as f:
  data = json.load(f)
with open("dist/manifest.json", "w", encoding="utf-8") as f:
  json.dump(data, f, separators=(",", ":"), ensure_ascii=False)

# index.html
os.remove("dist/index.html")
os.rename("dist/index.min.html", "dist/index.html")

# noscript.css
os.remove("dist/noscript.css")
os.rename("dist/noscript.min.css", "dist/noscript.css")
