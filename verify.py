"""Run with python3 verify.py. Check static local references and JS syntax."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
import subprocess
root = Path(__file__).resolve().parent
class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        self.urls.extend(v for k, v in attrs if k in ('src', 'href') and v)
count = 0
for file in root.rglob('*.html'):
    parser = References()
    parser.feed(file.read_text())
    for url in parser.urls:
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        target = (file.parent / unquote(parsed.path)).resolve()
        assert target.is_relative_to(root), f'Outside site: {url}'
        assert target.exists(), f'Missing reference in {file.name}: {url}'
        count += 1
for file in root.rglob('*.js'):
    subprocess.run(['node', '--check', str(file)], check=True)
for asset in re.findall(r'(?:src|href)="((?:assets|demos)/[^"$]+)"', (root/'script.js').read_text()):
    assert (root/asset).exists(), f'Missing case-study asset: {asset}'
print(f'PASS: {count} local HTML references, case-study assets, and JavaScript syntax.')
