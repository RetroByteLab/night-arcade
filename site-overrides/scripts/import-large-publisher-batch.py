"""Import forty additional explicit publisher embeds, or rebuild their saved wrappers."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'catalog-sources/large-publishers.json'
INDEX = 'https://www.twoplayergames.org/our'
PICKS = [
    ('geometry-vibes', 'Arcade', 'Dodge obstacles through geometric rhythm courses.'),
    ('mx-offroad-mountain-bike', 'Racing', 'Ride mountain bikes over rugged off-road courses.'),
    ('fish-eat-getting-big', 'Arcade', 'Grow a fish by collecting food and avoiding larger rivals.'),
    ('two-ball-3d', 'Arcade', 'Guide rolling balls along elevated obstacle tracks.'),
    ('night-city-racing', 'Racing', 'Race through a neon-lit city and try driving challenges.'),
    ('mx-offroad-master', 'Racing', 'Tackle mountain-bike courses and balance challenges.'),
    ('grand-extreme-racing', 'Racing', 'Compete in open-wheel circuit races.'),
    ('minibattles-2-6-players', 'Multiplayer', 'Choose quick local party-game competitions.'),
    ('ultimate-flying-car', 'Racing', 'Drive and fly futuristic cars across a city.'),
    ('geometry-vibes-x-ball', 'Arcade', 'Guide a geometric ball through reflex challenges.'),
    ('tag-run', 'Platformer', 'Run and jump through fast local tag matches.'),
    ('2-3-4-player-games', 'Multiplayer', 'Choose from short local multiplayer challenges.'),
    ('summer-rider-3d', 'Racing', 'Ride through summer-themed obstacle courses.'),
    ('grand-city-racing', 'Racing', 'Try city races and free-driving challenges.'),
    ('obby-on-a-bike', 'Platformer', 'Balance a bike across suspended parkour courses.'),
    ('two-punk-racing', 'Racing', 'Race futuristic cars over winding stunt tracks.'),
    ('snow-rush-3d', 'Racing', 'Dodge snowy obstacles on a downhill sled ride.'),
    ('fly-car-stunt-5', 'Racing', 'Jump between elevated platforms in stunt cars.'),
    ('geometry-vibes-x-arrow', 'Arcade', 'Steer an arrow through narrow geometric passages.'),
    ('city-minibus-driver', 'Simulation', 'Drive a minibus through city routes and challenges.'),
    ('obby-tower-parkour-climb', 'Platformer', 'Climb a tower of colorful parkour obstacles.'),
    ('ball-eating-simulator', 'Arcade', 'Grow a rolling ball while navigating an arena.'),
    ('grand-city-stunts', 'Racing', 'Explore a city filled with driving stunt challenges.'),
    ('two-ball-3d-dark', 'Arcade', 'Roll through a dark variation of elevated ball tracks.'),
    ('hangman', 'Puzzle', 'Guess the missing letters in a word puzzle.'),
    ('city-bike-stunt-2', 'Racing', 'Ride motorcycles through city stunt courses.'),
    ('dino-game', 'Arcade', 'Jump a dinosaur over obstacles in an endless run.'),
    ('city-truck-driver', 'Simulation', 'Take a truck through city driving challenges.'),
    ('2048-duel', 'Puzzle', 'Combine numbered tiles in a competitive puzzle.'),
    ('ninja-obby-parkour', 'Platformer', 'Leap across a ninja-themed obstacle course.'),
    ('rolling-balls-sea-race', 'Racing', 'Roll along obstacle tracks suspended above the sea.'),
    ('snake-2048-io', 'Arcade', 'Grow a numbered snake by merging smaller tiles.'),
    ('tank-mayhem', 'Arcade', 'Play compact cartoon tank battles in maze arenas.'),
    ('monster-cars-ultimate-simulator', 'Racing', 'Drive large off-road vehicles through challenges.'),
    ('tube-jumpers', 'Multiplayer', 'Keep your character balanced in chaotic tube matches.'),
    ('two-bike-stunts', 'Racing', 'Perform motorcycle stunts across obstacle courses.'),
    ('12-minibattles', 'Multiplayer', 'Compete in a collection of quick two-player mini-games.'),
    ('atv-ultimate-offroad', 'Racing', 'Drive an ATV across off-road routes and stunt areas.'),
    ('shape-transform-race', 'Racing', 'Change your shape to match the terrain ahead.'),
    ('city-car-stunt-4', 'Racing', 'Race and jump through city stunt tracks.'),
    ('city-car-stunt-2', 'Racing', 'Drive across suspended city stunt courses.'),
    ('dirt-bike-max-duel', 'Racing', 'Race dirt bikes over bumpy off-road tracks.'),
    ('two-punk-racing-2', 'Racing', 'Return to futuristic city racing challenges.'),
    ('riders-downhill-racing', 'Racing', 'Race downhill on winding bike courses.'),
    ('island-monster-offroad', 'Racing', 'Explore island terrain in monster vehicles.'),
    ('fish-eat-grow-big', 'Arcade', 'Collect food and grow while avoiding larger fish.'),
    ('g-switch-2', 'Platformer', 'Switch gravity while running through futuristic tracks.'),
    ('dirt-bike-racing-duel', 'Racing', 'Race motorcycles over tricky obstacle tracks.'),
    ('ultimate-flying-car-2', 'Racing', 'Explore another city with driving and flying cars.'),
    ('offroad-masters-challenge', 'Racing', 'Drive across rugged routes and off-road challenges.'),
]


class GameLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = {}

    def handle_starttag(self, tag, attrs):
        if tag != 'a':
            return
        href = dict(attrs).get('href', '')
        url = urlparse(urljoin(INDEX, href))
        if url.hostname == 'www.twoplayergames.org' and url.path.startswith('/game/'):
            self.links[url.path.rstrip('/').split('/')[-1]] = url.geturl()


def fetch(url):
    return subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '30', url]).decode()


def build(records):
    template = (ROOT / 'publisher-player.html').read_text()
    for record in records:
        if not re.fullmatch(r'games/tpg-[a-z0-9-]+/index.html', record['localPath']):
            raise ValueError('Invalid local player path')
        if not record['embedUrl'].startswith('https://www.twoplayergames.org/embed/'):
            raise ValueError('Invalid publisher embed host')
        player = template
        for key, value in {'TITLE': record['title'], 'SOURCE': record['sourceUrl'], 'EMBED': record['embedUrl']}.items():
            player = player.replace('{{' + key + '}}', html.escape(value, quote=True))
        target = ROOT / record['localPath']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(player)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--build-only', action='store_true')
    args = parser.parse_args()
    if args.build_only:
        build(json.loads(MANIFEST.read_text()))
        return
    catalog = json.loads((ROOT / 'games.json').read_text())
    inventory = GameLinks()
    inventory.feed(fetch(INDEX))
    records = []
    for slug, category, description in PICKS:
        if slug not in inventory.links:
            print('Not listed, skipped: ' + slug, flush=True)
            continue
        page = inventory.links[slug]
        content = fetch(page)
        match = re.search(r'window\.gameData\s*=\s*(\{[^\n]+\})', content)
        if not match:
            raise ValueError('Missing publisher metadata: ' + slug)
        data = json.loads(match[1])
        if 'game-page-share-embed' not in content or data['embedFrame'] != 'https://www.twoplayergames.org/embed/' + slug:
            raise ValueError('Missing explicit embed permission: ' + slug)
        prior = next((g for g in catalog if g['title'].casefold() == data['title'].casefold()), None)
        if prior and prior['launchMethod'].startswith('about-blank'):
            print('Already in Play library, skipped: ' + data['title'], flush=True)
            continue
        embed_content = fetch(data['embedFrame'])
        game_id = prior['id'] if prior else 'tpg-' + slug
        path = 'games/tpg-' + slug + '/index.html'
        categories = [category]
        if category == 'Racing':
            categories.append('Arcade')
        elif category == 'Platformer':
            categories.append('Adventure')
        game = {'id': game_id, 'title': data['title'], 'description': description, 'categories': categories, 'keywords': [slug.replace('-', ' '), 'publisher embed'], 'thumbnail': 'https://images.twoplayergames.org/files/games/' + data['imageFile'], 'sourceUrl': page, 'sourceName': 'TwoPlayerGames publisher embed', 'sourceInfo': 'Listed in the publisher own-games catalog; its game page explicitly supplies an Embed control and embedFrame URL. Only the local player wrapper is hosted. Game assets, advertising and SDK remain unchanged on publisher servers.', 'license': 'Publisher-provided embed HTML', 'licenseUrl': page, 'launchMethod': 'about-blank-html', 'localPath': path, 'compatibility': 'untested', 'status': 'Not tested', 'compatibilityNote': 'Publisher-provided embed responded successfully. Gameplay, actual popup rendering, redirects, mobile and fullscreen have not passed complete browser testing.', 'deviceCompatibility': ['needs-review'], 'added': '2026-10-20', 'featured': False}
        if prior:
            catalog[catalog.index(prior)] = game
        else:
            catalog.append(game)
        records.append({'catalogId': game_id, 'title': data['title'], 'sourceUrl': page, 'embedUrl': data['embedFrame'], 'localPath': path, 'pageSha256': hashlib.sha256(content.encode()).hexdigest(), 'embedPageSha256': hashlib.sha256(embed_content.encode()).hexdigest(), 'embedHttpResponse': 200, 'evidence': 'Public publisher own-games listing, explicit Embed control and supplied embedFrame. Embed only, not redistribution of game assets.', 'verification': 'untested'})
        print('Prepared ' + str(len(records)) + '/40: ' + data['title'], flush=True)
        if len(records) == 40:
            break
    if len(records) != 40:
        raise ValueError('Fewer than forty new entries verified; catalog has not been changed.')
    build(records)
    MANIFEST.write_text(json.dumps(records, indent=2) + '\n')
    (ROOT / 'games.json').write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
