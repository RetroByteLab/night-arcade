"""Restore the pinned original-draft Snow Rider runtime during publication."""
import hashlib
from pathlib import Path
from urllib.request import urlopen

BASE = "https://raw.githubusercontent.com/lcpsgames/snowrider/e02aa65c32bce0c35032a2f35ab9d5d70241b55e/"
FILES = {'TemplateData/UnityProgress.js': '47a2478d3f38d0f15f86aa0095e52a7fdd5e2cb7875e9c330261af82999dca2e', 'TemplateData/favicon.ico': '03bc9b4583617dbe8d17c64ea51c7942c0e396011d6e0b820c247626b30e76ee', 'TemplateData/gears.gif': 'be9413d2f13321c983026c9f6b815ba820c5b1d91c4d2b763a9ef044afe0f187', 'TemplateData/logo.png': '4e6a5b6bdc7a8735966665185ff9a8f793db99d6a71fa2e1c4e83fa292d097bd', 'TemplateData/style.css': '54700a639dd7eb51e9d5f9184c9f491f99eb9d34a40d4baa8caae9b08f1d3af3', 'Build/SnowRider3D-gd-1.wasm.framework.unityweb': 'cfada7f23ce77549a8bed752d21da46555aa5fb7f64248535efd9a0a8ce3eb17', 'Build/SnowRider3D-gd-1.data.unityweb': 'edf4be0d0a9564c9429220f3bcbef5bbeddc8c0ec540e36982a891d27d57adea', 'Build/UnityLoader.js': '586b45e52af43bb074f2c57c4b70488620e0317c96af655e060d65ef6253cbe0', 'Build/SnowRider3D-gd-1.json': 'e72deaf73d130b1bbd37c97e3f18b99d63c13372112b9cbfebae7d75bbddf6ee', 'Build/SnowRider3D-gd-1.wasm.code.unityweb': '7e5927e38bd760bfe74c5aaa44d49b3e7af13ef298cd4f2cb06ad016fe550511'}
root = Path("_site/games/snow-rider-3d")
for relative, expected in FILES.items():
    data = urlopen(BASE + relative, timeout=90).read()
    if hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError("Original build checksum mismatch: " + relative)
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
print("Original Snow Rider runtime verified and restored")
