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
    print("Top level keys:", list(c_data.keys()))
    doc = c_data.get("document", {})
    print("Document keys:", list(doc.keys()))
    for k, v in doc.items():
        if isinstance(v, list):
            print(f"List key '{k}': length {len(v)}")
            if v and isinstance(v[0], dict):
                print(f"Sample item from '{k}':", list(v[0].keys()))
                print(v[0])
        elif isinstance(v, dict):
            print(f"Dict key '{k}': keys {list(v.keys())}")
        else:
            print(f"Scalar key '{k}': {v}")
