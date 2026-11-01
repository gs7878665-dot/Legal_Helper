import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def inspect_mapping(filename):
    url = f"https://huggingface.co/datasets/GSMS-B/indian-legal-knowledge-base-json/raw/main/raw_acts/{filename}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        data = json.loads(resp.read().decode())
        print(f"=== {filename} ===")
        print("Type:", type(data))
        if isinstance(data, list):
            print("Length:", len(data))
            if data:
                print("Item 0:", data[0])
                print("Item 1:", data[1] if len(data) > 1 else None)
        elif isinstance(data, dict):
            print("Keys:", list(data.keys())[:10])
            for k in list(data.keys())[:3]:
                print(f"Key '{k}':", data[k])

inspect_mapping("bns_to_ipc.json")
inspect_mapping("bnss_to_crpc.json")
inspect_mapping("bsa_to_iea.json")
