import glob
import json
import os

# JSON
for path in glob.glob("dist/*.json"):
  with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
  with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"), ensure_ascii=False)

# index.html
os.remove("dist/index.html")
os.remove("dist/index.ssr.html")
os.rename("dist/index.min.html", "dist/index.html")
