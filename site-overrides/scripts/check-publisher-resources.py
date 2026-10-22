"""Passive HEAD checks of configured game frames and thumbnails; no gameplay claim."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


class Frames(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        value = dict(attrs).get('src', '')
        if tag == 'iframe' and value.startswith('https://'):
            self.urls.append(value)


targets = {}
for game in json.loads((ROOT / 'games.json').read_text()):
    if not game['launchMethod'].startswith('about-blank'):
        continue
    thumbnail = game.get('thumbnail', '')
    if thumbnail.startswith('https://'):
        targets.setdefault(thumbnail, {'roles': [], 'games': []})
        targets[thumbnail]['roles'].append('thumbnail')
        targets[thumbnail]['games'].append(game['id'])
    if game.get('localPath'):
        parser = Frames()
        parser.feed((ROOT / game['localPath']).read_text())
        for url in parser.urls:
            targets.setdefault(url, {'roles': [], 'games': []})
            targets[url]['roles'].append('publisher-frame')
            targets[url]['games'].append(game['id'])


def check(item):
    url, metadata = item
    request = Request(url, method='HEAD', headers={'User-Agent': 'NightArcade-Compatibility-Check/1.0'})
    result = {'url': url, **metadata}
    try:
        with urlopen(request, timeout=8) as response:
            result.update({'httpStatus': response.status, 'finalUrl': response.url, 'contentType': response.headers.get('Content-Type', ''), 'xFrameOptions': response.headers.get('X-Frame-Options'), 'contentSecurityPolicy': response.headers.get('Content-Security-Policy')})
    except HTTPError as error:
        result.update({'httpStatus': error.code, 'note': 'HEAD response is not a browser gameplay or iframe compatibility verdict.'})
    except (URLError, TimeoutError, OSError) as error:
        result.update({'httpStatus': None, 'note': str(error)})
    return result


with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check, targets.items()))
summary = dict(Counter(str(item['httpStatus']) for item in results))
report = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'method': 'One standard HEAD request per configured HTTPS frame/thumbnail, up to four simultaneous requests. No retries, browser impersonation, access-control workarounds, asset downloads or gameplay verification. HEAD 403/405 can differ from browser GET results.', 'checked': len(results), 'summary': summary, 'results': results}
(ROOT / 'catalog-sources/network-check.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'checked': len(results), 'summary': summary}, indent=2))
