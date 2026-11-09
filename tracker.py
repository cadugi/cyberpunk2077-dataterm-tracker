"""Read-only Cyberpunk dataterm exporter. All parsing runs on a snapshot copy."""
from pathlib import Path
import argparse,csv,datetime,hashlib,json,os,shutil,struct,sys,traceback,webbrowser
ROOT=Path(__file__).resolve().parent
RESOURCE_ROOT=Path(getattr(sys,'_MEIPASS',ROOT))
LOCALES=json.loads((RESOURCE_ROOT/'data/locales.json').read_text(encoding='utf-8'))
LANG='en'
def tr(key,**params):return LOCALES[LANG].get(key,LOCALES['en'].get(key,key)).format(**params)
def point_name(p):return (p.get('name_en') or p['name']) if LANG=='en' else p['name']
def district(value):return LOCALES['districts'].get(value,value) if LANG=='en' else value
def reason(p):
    if p['state']=='DESCUBIERTOS':return tr('reasonDiscovered')
    if p['state']=='PENDIENTES':return tr('reasonMissing')
    if p['scope']=='unknown':return tr('reasonUnknown')
    return (LOCALES['notes'].get(p.get('note'),tr('reasonUnverified')) if LANG=='en' else p.get('note')) or tr('reasonUnverified')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write_json(p,data):p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def parse_copy(folder):
    # This old library is used only for decompression and typed package reads.
    # The 2.50-specific gate and every array/handle/field are checked below.
    with (folder/'sav.dat').open('rb') as handle:header=handle.read(12)
    if len(header)!=12 or header[:4]!=b'VASC' or struct.unpack_from('<II',header,4)!=(277,2500):raise ValueError(tr('unsupportedSave'))
    sys.path.insert(0,str(RESOURCE_ROOT/'vendor'))
    from cp2077chunk import DataChunkTableChunk
    from cp2077save import SaveFile
    DataChunkTableChunk.VALID_CAPACITY=(256,512,1024)
    SaveFile.save=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('Save writing disabled'))
    s=SaveFile(folder);save_version=struct.unpack_from('<I',s.header,4)[0]
    if (save_version,s.header.game_ver)!=(277,2500):raise ValueError(tr('unsupportedSave'))
    # Do not exit the context: the vendor's __exit__ reserializes memory.
    package=s.nodes.ScriptableSystemsContainer.__enter__()
    ft=package.FastTravelSystem
    _,kind,sl=ft._field_info('fastTravelNodes')
    if str(kind)!='array:handle:gameFastTravelPointData':raise ValueError(tr('wrongType'))
    raw=bytes(ft)[sl];n=struct.unpack_from('<I',raw)[0]
    if len(raw)!=4+4*n or n>10000:raise ValueError(tr('arrayIncomplete'))
    points=[]
    for i in struct.unpack_from('<'+'I'*n,raw,4):
        if i>=len(package):raise ValueError('Handle fuera de límites')
        p=package[i]
        if p._name!='gameFastTravelPointData':raise ValueError(tr('handleClass'))
        rid=struct.unpack('<Q',p.pointRecord)[0];marker=p.markerRef
        size=struct.unpack_from('<H',marker)[0]
        if len(marker)!=size+2:raise ValueError(tr('markerIncomplete'))
        ep=p['isEP1'] if 'isEP1' in dir(p) else False
        points.append({'id':str(rid),'marker':marker[2:].decode('utf-8').rstrip('\0'),'is_ep1':ep})
    return {'schema':1,'game_version':'2.50','save_version':277,'source':'save-copy','complete':True,'registered_count':n,'last_achievement_count':ft.lastUpdatedAchievementCount,'points':points,'errors':[]}
def validate(ex):
    if not isinstance(ex,dict) or ex.get('schema')!=1 or ex.get('game_version')!='2.50':raise ValueError('Extracción de versión o formato no admitidos')
    pts=ex.get('points')
    if not isinstance(pts,list) or not isinstance(ex.get('errors'),list) or type(ex.get('complete')) is not bool:raise ValueError(tr('metadata'))
    if ex.get('registered_count')!=len(pts):raise ValueError(tr('metadata'))
    for p in pts:
        if not isinstance(p,dict) or not isinstance(p.get('id'),str) or not p['id'].isdigit() or int(p['id'])>=2**40 or type(p.get('is_ep1')) is not bool:raise ValueError(tr('node'))
    keys=[(p['id'],p.get('marker')) for p in pts]
    if len(set(keys))!=len(keys):raise ValueError(tr('duplicates'))
    return ex
def compare(reference,ex):
    validate(ex);by={p['id']:p for p in reference['points']};found={}
    for p in ex['points']:found.setdefault(p['id'],[]).append(p)
    complete=ex['complete'] and not ex['errors'];rows=[]
    runtime_count=sum(1 for p in ex['points'] if p['id'] in by and by[p['id']]['show_on_world_map'] and not p['is_ep1'])
    runtime_mismatch=ex.get('source')=='cet' and (ex.get('engine_achievement_count')!=runtime_count or any(p.get('show_on_world_map')!=by[p['id']]['show_on_world_map'] for p in ex['points'] if p['id'] in by))
    if runtime_mismatch:complete=False
    if any(p['id'] not in by for p in ex['points']):complete=False
    for p in reference['points']:
        row=dict(p);entries=found.get(p['id'],[])
        if entries:state='DESCUBIERTOS';reason='ID exacto presente en FastTravelSystem'
        elif complete and p['scope']=='base' and p['verified_destination']:state='PENDIENTES';reason='Terminal real verificado y ausente del registro completo'
        else:state='NO VERIFICADOS';reason=p['note'] or 'No hay evidencia suficiente para afirmar un pendiente'
        row.update(state=state,reason=reason);rows.append(row)
    for rid,entries in found.items():
        if rid not in by:rows.append({'id':rid,'record':'','name':'ID desconocido '+rid,'name_en':'','district':'Sin distrito verificado','scope':'unknown','state':'NO VERIFICADOS','reason':'Registrado, pero no reconocido por el catálogo 2.50','note':'','locations':[]})
    eligible=sum(1 for p in ex['points'] if p['id'] in by and by[p['id']]['show_on_world_map'] and not p['is_ep1'])
    unknown_ids=[p['id'] for p in ex['points'] if p['id'] not in by]
    base=[p for p in rows if p['scope']=='base']
    counts={s:sum(p['state']==s for p in base) for s in ['DESCUBIERTOS','PENDIENTES','NO VERIFICADOS']}
    return {'schema':1,'source':ex.get('source'),'slot':ex.get('slot'),'extracted_at':ex.get('extracted_at'),'save_sha256':ex.get('save_sha256'),'catalog_total':len(by),'registered_count':len(ex['points']),'base_catalog_total':len(base),'counts':counts,'achievement_count':eligible if not unknown_ids and complete else None,'achievement_threshold':reference['achievement_threshold'],'last_achievement_count':ex.get('last_achievement_count'),'unknown_ids':unknown_ids,'complete':complete,'runtimeMismatch':runtime_mismatch,'rows':rows}
def csv_write(path,rows,fields):
    def safe(v):
        s='' if v is None else str(v)
        return "'"+s if s[:1] in '=+-@\t\r' else s
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader()
        for row in rows:w.writerow({k:safe(row.get(k)) for k in fields})
def publish(ex,output,lang="en"):
    global LANG
    LANG=lang
    validate(ex);ref=json.loads((RESOURCE_ROOT/'data/reference.json').read_text(encoding='utf-8'));report=compare(ref,ex)
    output.mkdir(parents=True,exist_ok=True)
    for name in ['index.html','style.css','app.js','compare.js','reference.js','map.html','map.js','locales.js','i18n.js']:
        shutil.copy2(RESOURCE_ROOT/name,output/name)
    if (RESOURCE_ROOT/'tiles').is_dir():shutil.copytree(RESOURCE_ROOT/'tiles',output/'tiles',dirs_exist_ok=True)
    write_json(output/'extraction.json',ex);write_json(output/'comparison.json',report)
    csv_write(output/'extraction.csv',ex['points'],['id','marker','is_ep1'])
    csv_write(output/'comparison.csv',report['rows'],['id','record','name','name_en','district','scope','state','reason'])
    (output/'extraction.js').write_text('window.TRACKER_DEFAULT_LANGUAGE='+json.dumps(LANG)+';\nwindow.TRACKER_EXTRACTION='+json.dumps(ex,ensure_ascii=False).replace('<','\\u003c')+';\n',encoding='utf-8')
    localized=[]
    for p in report['rows']:
        localized.append({'id':p['id'],'record':p.get('record',''),'state_code':p['state'],tr('csvState'):tr(p['state']),tr('csvName'):point_name(p),tr('csvDistrict'):district(p['district']),tr('csvReason'):reason(p)})
    csv_write(output/'comparison.csv',localized,['id','record','state_code',tr('csvState'),tr('csvName'),tr('csvDistrict'),tr('csvReason')])
    selected=LANG
    for language,filename in [('en','REPORT.md'),('es','RESULTADO.md')]:
        LANG=language
        lines=['# '+tr('reportTitle'),'',tr('reportSave',slot=ex.get('slot','CET'),date=ex.get('extracted_at',tr('reportUnknownDate'))),tr('reportCount',count=len(ex['points']),counter=report['achievement_count'],threshold=report['achievement_threshold']),'','## '+tr('reportMissing'),'']
        for p in report['rows']:
            if p['state']=='PENDIENTES':
                candidates=[]
                for other in report['rows']:
                    if other['state']=='DESCUBIERTOS' and other['scope']=='base' and other.get('locations'):
                        distance=min(((a[0]-b[0])**2+(a[1]-b[1])**2)**0.5 for a in p['locations'] for b in other['locations'])
                        candidates.append((distance,point_name(other)))
                nearby=', '.join(f'{name} (~{distance:.0f} m)' for distance,name in sorted(candidates)[:2]) or tr('reportNoNearby')
                lines.append('- **'+point_name(p)+'** / '+district(p['district'])+' / '+tr('reportCoordinates')+': '+str(p['locations'])+' / '+tr('reportNearby')+': '+nearby+' ('+tr('reportStraight')+') / ID `'+p['record']+'`')
        lines+=['','## '+tr('reportUnverified'),'']
        for p in report['rows']:
            if p['scope']=='base' and p['state']=='NO VERIFICADOS':lines.append('- '+point_name(p)+': '+reason(p))
        lines+=['',tr('reportNote')]
        (output/filename).write_text('\n'.join(lines)+'\n',encoding='utf-8')
    LANG=selected
    print(json.dumps({k:v for k,v in report.items() if k!='rows'},ensure_ascii=False,indent=2))
    return report
def main():
    global LANG
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-runtime',action='store_true',help='Check bundled browser module without opening windows')
    parser.add_argument('--lang',choices=['en','es'],default='en',help='Language: English (default) or Spanish')
    parser.add_argument('--save-file',type=Path,help='Path to sav.dat (original is only read to make a copy)')
    parser.add_argument('--saves-dir',type=Path,help='Custom save folder (supports cross-progression copies)')
    parser.add_argument('--latest',action='store_true',help='Use most recent save; never used implicitly')
    parser.add_argument('--import-json',type=Path)
    parser.add_argument('--output',type=Path,help='Output directory; default: next to executable/source')
    parser.add_argument('--no-open',action='store_true');args=parser.parse_args()
    if args.check_runtime:
        assert callable(webbrowser.open)
        return
    LANG=args.lang
    portable=Path(sys.executable).resolve().parent if getattr(sys,'frozen',False) else ROOT
    output=(args.output or portable/'output').resolve()
    if args.import_json:
        publish(json.loads(args.import_json.read_text(encoding='utf-8-sig')),output,LANG)
        if not args.no_open:webbrowser.open((output/'index.html').as_uri())
        return
    saves=args.saves_dir or Path(os.environ.get('USERPROFILE',str(Path.home())))/'Saved Games/CD Projekt Red/Cyberpunk 2077'
    if args.save_file:source=args.save_file.resolve().parent
    elif args.latest:
        candidates=[p for p in saves.iterdir() if (p/'sav.dat').exists()]
        if not candidates:raise ValueError(tr('noSaves'))
        source=max(candidates,key=lambda p:(p/'sav.dat').stat().st_mtime)
    else:
        import tkinter as tk
        from tkinter import filedialog
        window=tk.Tk();window.withdraw()
        selected=filedialog.askopenfilename(title=tr('pickerTitle'),initialdir=str(saves) if saves.exists() else str(Path.home()),filetypes=[(tr('pickerFile'),'sav.dat')])
        window.destroy()
        if not selected:return
        source=Path(selected).resolve().parent
    if args.save_file and args.save_file.name!='sav.dat':raise ValueError(tr('chooseSavDat'))
    if output==source or source in output.parents or output in source.parents:raise ValueError(tr('separateOutput'))
    before=digest(source/'sav.dat');stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    destination=output/'backups'/f'{source.name}-{stamp}';destination.mkdir(parents=True)
    for name in ['sav.dat','metadata.9.json']:
        if (source/name).exists():shutil.copy2(source/name,destination/name)
    if digest(source/'sav.dat')!=before or digest(destination/'sav.dat')!=before:raise ValueError(tr('saveWriting'))
    ex=parse_copy(destination)
    if digest(source/'sav.dat')!=before or digest(destination/'sav.dat')!=before:raise ValueError('La instantánea cambió durante la lectura')
    ex.update(slot=source.name,save_sha256=before,extracted_at=datetime.datetime.now().astimezone().isoformat(),save_modified_at=datetime.datetime.fromtimestamp((source/'sav.dat').stat().st_mtime).astimezone().isoformat())
    write_json(destination/'integrity.json',{'sha256_before':before,'sha256_after':digest(source/'sav.dat'),'copy_sha256':digest(destination/'sav.dat'),'game_version':2500,'save_version':277})
    publish(ex,output,LANG)
    if not args.no_open:webbrowser.open((output/'index.html').as_uri())
if __name__=='__main__':
    try:main()
    except Exception as e:
        error={'time':datetime.datetime.now().astimezone().isoformat(),'error':str(e),'traceback':traceback.format_exc()}
        print('ERROR:',e,file=sys.stderr)
        if getattr(sys,'frozen',False) and '--no-open' not in sys.argv:
            try:
                import tkinter as tk
                from tkinter import messagebox
                root=tk.Tk();root.withdraw();messagebox.showerror(tr('readerError'),tr('readFailure',message=str(e)));root.destroy()
            except Exception:pass
        sys.exit(1)
