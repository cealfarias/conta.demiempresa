import re

with open('auth_module.py', 'r', encoding='utf-8') as f:
    code = f.read()

new_code = code.replace(
    'if path in public_paths and request.method == "POST":\n        return None',
    'if path in public_paths and request.method == "POST":\n        return None\n        \n    if path.startswith("/api/v1/usuarios/check-email/") and request.method == "GET":\n        return None'
)

with open('auth_module.py', 'w', encoding='utf-8') as f:
    f.write(new_code)
