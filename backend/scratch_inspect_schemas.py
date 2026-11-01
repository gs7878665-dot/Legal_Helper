import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def inspect_hf_file(repo, filepath, preview_bytes=2000):
    url = f"https://huggingface.co/datasets/{repo}/raw/main/{filepath}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            content = resp.read(preview_bytes).decode("utf-8", errors="replace")
            print(f"=== {repo} / {filepath} ===")
            print(content[:600])
            print("...\n")
    except Exception as e:
        print(f"Error fetching {url}: {e}\n")

# 1. GSMS-B/indian-legal-sections-bns-bnss-bsa-2023
inspect_hf_file("GSMS-B/indian-legal-sections-bns-bnss-bsa-2023", "bns_sections.json")
inspect_hf_file("GSMS-B/indian-legal-sections-bns-bnss-bsa-2023", "bns_bnss_bsa_sections.json")

# 2. GSMS-B/indian-legal-knowledge-base-json (Constitution sample)
inspect_hf_file("GSMS-B/indian-legal-knowledge-base-json", "raw_acts/CONSTITUTION_DATASET.json")

# 3. aashnasharma/govintel-legal-dataset (cross-code edges)
inspect_hf_file("aashnasharma/govintel-legal-dataset", "graph/cross_code_edges.json")

# 4. GitHub DanielDeshmukh/themis/context
url = "https://api.github.com/repos/DanielDeshmukh/themis/contents/context"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
        data = json.loads(resp.read().decode())
        print("THEMIS context files:", [f["name"] for f in data])
except Exception as e:
    print("THEMIS context error:", e)
