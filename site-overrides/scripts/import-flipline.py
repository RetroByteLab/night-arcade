"""Build the explicitly redistributable Flipline classics from pinned packages."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PERMISSION = 'https://www.flipline.com/freegames.html'
MANIFEST = ROOT / 'catalog-sources/flipline.json'

def download(url, digest=None):
    content = subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--retry','3','--max-time','90',url])
    sha = hashlib.sha256(content).hexdigest()
    if digest and sha != digest:
        raise ValueError('Source checksum changed: ' + url)
    return content, sha

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls=[]
    def handle_starttag(self, tag, attrs):
        url=dict(attrs).get('href','')
        if tag=='a' and url.startswith('https://i.flipline.com/downloads/papas') and url.endswith('.zip'):
            self.urls.append(url)

def build(discover=False):
    if discover:
        page, page_sha = download(PERMISSION)
        parser=Links(); parser.feed(page.decode())
        manifest={'permissionUrl':PERMISSION,'permission':'Flipline supplies these ZIPs for uploading to other websites. Original SWFs and attribution are retained. Not a license for paid mobile or Deluxe editions.','pageSha256':page_sha,'games':[]}
        urls=[{'url':url} for url in dict.fromkeys(parser.urls)]
    else:
        manifest=json.loads(MANIFEST.read_text()); urls=manifest['games']
    built=[]
    for record in urls:
        content, sha=download(record['url'], record.get('sha256'))
        with ZipFile(io.BytesIO(content)) as archive:
            names=archive.namelist()
            swf=next(name for name in names if name.lower().endswith('.swf'))
            info_name=next(name for name in names if name.lower().endswith('gameinfo.txt'))
            info=archive.read(info_name).decode('utf-8',errors='replace')
            title=re.search(r'^Name:\s*(.+)',info,re.M)[1].strip()
            slug='flipline-'+re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-')
            folder=ROOT/'games'/slug;folder.mkdir(parents=True,exist_ok=True)
            (folder/'game.swf').write_bytes(archive.read(swf))
            (folder/'gameinfo.txt').write_text(info)
            image=next((name for name in names if name.lower().endswith('.jpg') and ('400x' in name or '278x' in name)), next(name for name in names if name.lower().endswith('.jpg')))
            (folder/'thumbnail.jpg').write_bytes(archive.read(image))
            template=(ROOT/'flash-player.html').read_text()
            (folder/'index.html').write_text(template.replace('{{TITLE}}',html.escape(title)))
            built.append({**record,'sha256':sha,'title':title,'id':slug,'swfMember':swf})
            print('Prepared '+title,flush=True)
    manifest['games']=built
    if discover:
        metadata=json.loads(download('https://registry.npmjs.org/@ruffle-rs/ruffle/latest')[0])
        package, sha=download(metadata['dist']['tarball'])
        manifest['ruffle']={'version':metadata['version'],'url':metadata['dist']['tarball'],'sha256':sha,'license':metadata['license'],'sourceUrl':'https://github.com/ruffle-rs/ruffle'}
        MANIFEST.write_text(json.dumps(manifest,indent=2)+'\n')
    else:
        package, _=download(manifest['ruffle']['url'],manifest['ruffle']['sha256'])
    vendor=ROOT/'vendor/ruffle';vendor.mkdir(parents=True,exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(package),mode='r:gz') as archive:
        for member in archive.getmembers():
            path=Path(member.name)
            if not member.isfile() or path.parts[0]!='package' or len(path.parts)!=2:
                continue
            (vendor/path.name).write_bytes(archive.extractfile(member).read())
    if discover:
        catalog=json.loads((ROOT/'games.json').read_text())
        catalog=[game for game in catalog if not game['id'].startswith('flipline-')]
        for record in built:
            game_id=record['id']
            catalog.append({'id':game_id,'title':record['title'],'description':'The original Flipline cooking classic.','categories':['Simulation'],'keywords':['papa','cooking','restaurant','flash'],'thumbnail':f'games/{game_id}/thumbnail.jpg','sourceUrl':PERMISSION,'sourceName':'Flipline Studios','sourceInfo':'Official publisher distribution package; original SWF is unchanged. Runs using the open-source Ruffle Flash emulator.','license':'Publisher-authorized free website distribution','licenseUrl':PERMISSION,'launchMethod':'about-blank-html','localPath':f'games/{game_id}/index.html','compatibility':'untested','status':'Not tested','compatibilityNote':'Authorized original SWF with Ruffle. Full gameplay and about:blank compatibility are not yet verified.','deviceCompatibility':['needs-review'],'added':'2026-10-20','featured':False})
        (ROOT/'games.json').write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--discover',action='store_true')
    build(parser.parse_args().discover)
