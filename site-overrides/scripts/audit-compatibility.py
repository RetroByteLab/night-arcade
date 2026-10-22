"""Check reachable local resources and catalog URLs, without running game code."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlparse


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {'script', 'iframe', 'img', 'source', 'audio', 'video'}:
            value = attrs.get('src', '')
            self.urls.append((value, tag in {'script', 'iframe'}))
        elif tag == 'link' and any(rel in attrs.get('rel', '').split() for rel in ['stylesheet', 'preload', 'icon', 'manifest']):
            self.urls.append((attrs.get('href', ''), attrs.get('rel') == 'stylesheet'))


def audit(root):
    catalog = json.loads((root / 'games.json').read_text())
    result = {}
    domains = Counter()
    for game in catalog:
        issues = []
        for field in ['sourceUrl', 'embedUrl', 'thumbnail']:
            value = game.get(field, '')
            if not value or not re.match(r'^[a-z]+:', value):
                continue
            parsed = urlparse(value)
            if parsed.scheme not in {'https', 'http'} or not parsed.hostname or parsed.username or parsed.password:
                issues.append({'severity': 'error', 'kind': 'invalid-url', 'field': field})
            elif parsed.scheme == 'http':
                issues.append({'severity': 'warning', 'kind': 'insecure-url', 'field': field})
            if parsed.hostname:
                domains[parsed.hostname] += 1
        seen = set()
        checked = []

        def visit(path, required=True, owner=None):
            path = path.resolve()
            try:
                relative = str(path.relative_to(root))
            except ValueError:
                issues.append({'severity': 'error', 'kind': 'outside-project', 'file': str(path)})
                return
            if path in seen:
                return
            seen.add(path)
            if not path.is_file():
                issues.append({'severity': 'error' if required else 'warning', 'kind': 'missing-resource', 'file': relative, 'referencedBy': owner})
                return
            checked.append(relative)
            if path.suffix not in {'.html', '.css', '.js', '.mjs'}:
                return
            text = path.read_text(errors='replace')
            urls = []
            if path.suffix == '.html':
                parser = Resources()
                parser.feed(text)
                urls.extend(parser.urls)
            elif path.suffix == '.css':
                text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
                urls.extend((match.strip(' \"\''), False) for match in re.findall(r'url\(([^)]+)\)', text))
            else:
                urls.extend((match, True) for match in re.findall(r'(?:\bfrom\s*|\bimport\s*\(?\s*)[\"\']([^\"\']+)[\"\']', text) if match.startswith(('./', '../', '/')))
            for value, mandatory in urls:
                if not value or value.startswith(('#', 'data:', 'blob:')):
                    continue
                parsed = urlparse(value)
                if parsed.scheme or parsed.netloc:
                    if parsed.hostname:
                        domains[parsed.hostname] += 1
                    continue
                raw = unquote(parsed.path)
                if raw.startswith('/night-arcade/'):
                    child = root / raw[len('/night-arcade/'):]
                elif raw.startswith('/'):
                    issues.append({'severity': 'error' if mandatory else 'warning', 'kind': 'root-relative-project-path', 'url': raw, 'referencedBy': relative})
                    continue
                else:
                    child = path.parent / raw
                visit(child, mandatory, relative)

        if game['launchMethod'] in {'about-blank-local', 'about-blank-html'}:
            path = game.get('localPath', '')
            if re.fullmatch(r'games/[a-z0-9-]+/index\.html', path):
                visit(root / path)
            else:
                issues.append({'severity': 'error', 'kind': 'invalid-local-path'})
        thumbnail = game.get('thumbnail', '')
        if thumbnail and not urlparse(thumbnail).scheme:
            if not (root / thumbnail).is_file():
                issues.append({'severity': 'warning', 'kind': 'missing-thumbnail', 'file': thumbnail})
        result[game['id']] = {'state': 'failed' if any(i['severity'] == 'error' for i in issues) else 'untested', 'filesChecked': len(checked), 'issues': issues}
    return {'generatedAt': datetime.now(timezone.utc).isoformat(), 'catalogCount': len(catalog), 'gameIds': sorted(g['id'] for g in catalog), 'method': 'Static reachable HTML/CSS/import resource checks and URL validation only. No claim of gameplay, initialization, publisher availability or managed-browser approval.', 'games': result, 'referencedDomains': dict(sorted(domains.items()))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--check', action='store_true', help='Print findings without writing the report.')
    args = parser.parse_args()
    root = args.root.resolve()
    report = audit(root)
    if not args.check:
        (root / 'game-health.json').write_text(json.dumps(report, indent=2) + '\n')
    issues = {key: value['issues'] for key, value in report['games'].items() if value['issues']}
    print(json.dumps({'catalogCount': report['catalogCount'], 'gamesWithFindings': issues}, indent=2))
    if any(item['state'] == 'failed' for item in report['games'].values()):
        raise SystemExit(1)
