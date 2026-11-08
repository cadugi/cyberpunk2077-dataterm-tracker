"""Restore the bundled offline map tiles from the versioned archive parts."""
import hashlib,io,json,zipfile
from pathlib import Path

def prepare(root):
    root=Path(root)
    manifest=json.loads((root/'assets/map-tiles.json').read_text(encoding='utf-8'))
    data=b''.join((root/f'assets/map-tiles.zip.{i:03}').read_bytes() for i in range(1,manifest['parts']+1))
    if hashlib.sha256(data).hexdigest()!=manifest['sha256']:raise ValueError('Map archive checksum mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.infolist())!=manifest['file_count']:raise ValueError('Map archive file count mismatch')
        for item in archive.infolist():
            target=(root/item.filename).resolve()
            if not target.is_relative_to((root/'tiles').resolve()):raise ValueError('Unsafe map archive path')
        archive.extractall(root)

if __name__=='__main__':prepare(Path(__file__).resolve().parents[1])
