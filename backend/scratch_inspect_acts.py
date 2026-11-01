import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Check raw_acts list in GSMS-B/indian-legal-knowledge-base-json
url = "https://huggingface.co/api/datasets/GSMS-B/indian-legal-knowledge-base-json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
    data = json.loads(resp.read().decode())
    raw_acts = [f["rfilename"] for f in data.get("siblings", []) if f["rfilename"].startswith("raw_acts/")]
    print(f"Total raw acts found: {len(raw_acts)}")
    print("Sample acts:", raw_acts[:15])

# Also check Constitution structure in CONSTITUTION_DATASET.json
const_url = "https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/CONSTITUTION_DATASET.json"
req = urllib.request.Request(const_url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    c_data = json.loads(resp.read().decode())
    doc = c_data.get("document", {})
    parts = doc.get("parts", [])
    print(f"Constitution title: {doc.get('title')}, parts count: {len(parts)}")
    if parts:
        p0 = parts[0]
        print("Part 0:", p0.get("part_number"), p0.get("title"))
        articles = p0.get("articles", [])
        print("Articles in Part 0:", len(articles))
        if articles:
            print("Article 0 keys:", articles[0].keys(), articles[0].get("article_number"), articles[0].get("title"))
