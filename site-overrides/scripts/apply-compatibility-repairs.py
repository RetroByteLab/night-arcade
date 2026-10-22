"""Apply idempotent path/runtime repairs to a local or deployed static tree."""
import argparse
import json
from pathlib import Path
import re


def repair(root):
    changed = []
    for path in (root / 'games/cimulity').rglob('*'):
        if not path.is_file() or path.suffix not in {'.html', '.js', '.css', '.json', '.webmanifest'}:
            continue
        before = path.read_text()
        after = re.sub(r'(?<!/night-arcade)/games/cimulity', '/night-arcade/games/cimulity', before)
        if after != before:
            path.write_text(after)
            changed.append(str(path.relative_to(root)))
    catalog = json.loads((root / 'games.json').read_text())
    for game in catalog:
        if game['launchMethod'] != 'about-blank-html':
            continue
        path = root / game['localPath']
        if not path.is_file():
            continue
        before = path.read_text()
        after = before
        marker = 'data-night-arcade-runtime'
        if 'data-night-arcade-sizing' not in after:
            sizing = '<script defer data-night-arcade-sizing src="../../embed-player.js?v=20261021-1"></script>'
            after = after.replace('</head>', sizing + '</head>', 1)
        if marker not in after:
            runtime = '<script defer data-night-arcade-runtime src="../../player-runtime.js?v=20261021-1"></script>'
            after = after.replace('</head>', runtime + '</head>', 1)
        # These are our player wrappers, not the publishers' game code.
        after = after.replace("status.textContent='Game ready'", "status.textContent='Player loaded; gameplay unverified'")
        if 'player.ruffle().load(' in after and 'night-arcade:runtime-initialized' not in after:
            after = after.replace("await player.ruffle().load({url:new URL('game.swf',document.baseURI).href});", "await player.ruffle().load({url:new URL('game.swf',document.baseURI).href});\n    window.dispatchEvent(new Event('night-arcade:runtime-initialized'));")
        if after != before:
            path.write_text(after)
            changed.append(str(path.relative_to(root)))
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    changed = repair(args.root.resolve())
    print(json.dumps({'updatedFiles': len(changed), 'cimulityFiles': [p for p in changed if p.startswith('games/cimulity/')]}, indent=2))
