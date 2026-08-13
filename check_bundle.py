import re

with open('bundle.js', 'r', encoding='utf-8') as f:
    content = f.read()
    
# Buscar la constante VITE_API_URL o la asignacin en Login
match = re.search(r'VITE_API_URL:"([^"]+)"', content)
if match:
    print(f"VITE_API_URL in bundle is: {match.group(1)}")
else:
    print("VITE_API_URL no encontrado. Buscando fallback a localhost...")
    match = re.search(r'http://localhost:8000/api/login', content)
    if match:
        print("Fallback a localhost encontrado! Significa que VITE_API_URL no se inyect en el build de Vercel.")

    # Just search for "/api/login"
    login_matches = re.finditer(r'.{0,50}/api/login.{0,50}', content)
    for i, m in enumerate(login_matches):
        if i > 5: break
        print("Contexto de /api/login:", m.group(0))
