"""Reproducible resource list for a Windows x64 portable build (PyInstaller)."""
import subprocess,sys,shutil,hashlib,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
RESOURCES=['index.html','app.js','compare.js','style.css','reference.js','map.html','map.js','locales.js','i18n.js','data/locales.json','data/reference.json']
def main():
    args=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--onefile','--windowed','--name','Cyberpunk-Dataterm-Tracker','--hidden-import','tkinter','--hidden-import','webbrowser']
    for name in RESOURCES+[str(p.relative_to(ROOT)) for p in (ROOT/'vendor').iterdir() if p.is_file()]:
        destination=str(Path(name).parent)
        args+=['--add-data',f'{ROOT/name};{destination}']
    args+=[str(ROOT/'tracker.py')];subprocess.run(args,cwd=ROOT,check=True)
    release=ROOT/'dist';exe=release/'Cyberpunk-Dataterm-Tracker.exe';archive=release/'Cyberpunk-Dataterm-Tracker-v0.3.1-Windows-x64.zip'
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
        for p in [exe,ROOT/'README.md',ROOT/'LICENSE',ROOT/'THIRD_PARTY_NOTICES.md']:
            z.write(p,p.name)
        for p in (ROOT/'vendor').glob('*'):
            if p.name=='LICENSE':z.write(p,'licenses/CyberpunkPythonHacks-LICENSE')
    (release/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name for p in [exe,archive])+'\n',encoding='utf-8')
if __name__=='__main__':main()
