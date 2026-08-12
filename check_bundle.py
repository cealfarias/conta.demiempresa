import urllib.request
import re

req = urllib.request.Request('https://contabilidad.demiempresa.online/assets/index-DO6gNXc3.js', headers={'User-Agent': 'Mozilla/5.0'})
content = urllib.request.urlopen(req).read().decode('utf-8')

# Search for the API_URL assignment
m1 = re.search(r'const [a-zA-Z0-9_]+="([^"]+)"\|\|"http://localhost:8000"', content)
if m1:
    print(f"API_URL literal found: {m1.group(1)}")
else:
    # Maybe Vite replaced import.meta.env.VITE_API_URL completely
    m2 = re.search(r'axios\.post\("([^"]+)/api/login"', content)
    if m2:
        print(f"Axios post URL literal found: {m2.group(1)}")
    else:
        # Check if the string conta.demiempresa exists (with a dot)
        if "conta.demiempresa" in content:
            print("ERROR: 'conta.demiempresa' (with dot) still exists in bundle!")
        if "conta-demiempresa" in content:
            print("SUCCESS: 'conta-demiempresa' (with hyphen) exists in bundle!")
