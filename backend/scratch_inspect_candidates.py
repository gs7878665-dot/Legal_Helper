import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

candidates = [
    ("GSMS-B/indian-legal-knowledge-base-json", "https://huggingface.co/api/datasets/GSMS-B/indian-legal-knowledge-base-json"),
    ("GSMS-B/indian-legal-sections-bns-bnss-bsa-2023", "https://huggingface.co/api/datasets/GSMS-B/indian-legal-sections-bns-bnss-bsa-2023"),
    ("Hrutik2003/Bns_Law_RAG_DB", "https://huggingface.co/api/datasets/Hrutik2003/Bns_Law_RAG_DB"),
    ("aashnasharma/govintel-legal-dataset", "https://huggingface.co/api/datasets/aashnasharma/govintel-legal-dataset"),
    ("CHKishore/indic-criminal-law-llm-v1", "https://huggingface.co/api/datasets/CHKishore/indic-criminal-law-llm-v1"),
    ("DanielDeshmukh/themis (github)", "https://api.github.com/repos/DanielDeshmukh/themis/contents"),
]

for name, url in candidates:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, list):
                files = [f.get("name") for f in data[:8]]
                print(f"[{name}] OK - GitHub files: {files}")
            else:
                files = [f.get("rfilename") for f in data.get("siblings", [])[:8]]
                print(f"[{name}] OK - HF files: {files}")
    except Exception as e:
        print(f"[{name}] FAIL - {e}")
