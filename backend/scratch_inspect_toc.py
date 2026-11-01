import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/CONSTITUTION_DATASET.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    c_data = json.loads(resp.read().decode())
    toc = c_data.get("table_of_contents", [])
    print(f"TOC count: {len(toc)}")
    if toc:
        print("TOC 0:", toc[0])
        print("TOC 1:", toc[1] if len(toc) > 1 else None)
        art21_toc = next((t for t in toc if "21" in str(t.get("article_number") or t.get("number") or "")), None)
        print("TOC for Art 21:", art21_toc)
