"""Update the static storefront snapshot after editing products.json."""
import json
from pathlib import Path
root = Path(__file__).resolve().parent
products = json.loads((root / 'products.json').read_text(encoding='utf-8'))
if not isinstance(products, list):
    raise ValueError('products.json must contain a list of products')
path = root / 'script.js'
text = path.read_text(encoding='utf-8')
start_marker = '// BEGIN EMBEDDED PRODUCTS\n'
end_marker = '\n// END EMBEDDED PRODUCTS'
start = text.index(start_marker) + len(start_marker)
end = text.index(end_marker, start)
payload = 'const SAMPLE_PRODUCTS = ' + json.dumps(products, ensure_ascii=False, separators=(',', ':')) + ';'
path.write_text(text[:start] + payload + text[end:], encoding='utf-8')
print(f'Embedded {len(products)} products in script.js')
