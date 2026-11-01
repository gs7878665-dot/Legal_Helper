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
    articles = c_data.get("articles", [])
    print(f"Total articles in Constitution: {len(articles)}")
    if articles:
        print("Article 0 keys:", articles[0].keys())
        print("Article 0:", articles[0].get("article_number"), articles[0].get("title"))
        print("Article 0 text excerpt:", str(articles[0].get("text") or articles[0].get("content"))[:200])
        # Check Article 21
        art21 = next((a for a in articles if str(a.get("article_number")).strip() == "21"), None)
        if art21:
            print("\nFound Article 21:")
            print("Title:", art21.get("title"))
            print("Content excerpt:", str(art21.get("content") or art21.get("text"))[:250])
