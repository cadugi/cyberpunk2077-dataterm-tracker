"""Construct a tiny save from invented IDs for parser tests; no real save data."""
import struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'vendor'))
from cp2077chunk import HeaderChunk,DataChunkTableChunk,ChunkInfo,DataChunk,NodeTableChunk,NodeInfo,EndChunk
def make_save(folder,points):
    names=['FastTravelSystem','gameFastTravelPointData','fastTravelNodes','array:handle:gameFastTravelPointData','lastUpdatedAchievementCount','Int32','pointRecord','TweakDBID','markerRef','NodeRef','isEP1','Bool']
    def fields(items):
        head=struct.pack('<H',len(items));offset=2+8*len(items);body=b''
        for name,kind,value in items:
            head+=struct.pack('<HHI',names.index(name),names.index(kind),offset);body+=value;offset+=len(value)
        return head+body
    chunks=[(0,fields([('fastTravelNodes','array:handle:gameFastTravelPointData',struct.pack('<I',len(points))+b''.join(struct.pack('<I',i+1) for i in range(len(points)))),('lastUpdatedAchievementCount','Int32',struct.pack('<i',0))]))]
    for p in points:
        marker=p.get('marker','#synthetic').encode()
        chunks.append((1,fields([('pointRecord','TweakDBID',struct.pack('<Q',int(p['id']))),('markerRef','NodeRef',struct.pack('<H',len(marker))+marker),('isEP1','Bool',bytes([p.get('is_ep1',False)]))])))
    name_desc=b'';strings=b'';offset=4*len(names)
    for name in names:
        b=name.encode()+b'\0';name_desc+=struct.pack('<I',(len(b)<<24)|offset);strings+=b;offset+=len(b)
    desc=offset;cd=desc+8*len(chunks);chunk_desc=b'';data=b'';offset=cd
    for kind,chunk in chunks:chunk_desc+=struct.pack('<II',kind,offset);data+=chunk;offset+=len(chunk)
    payload=b'\x04\x00\x06\x00'+struct.pack('<I',1)+struct.pack('<IIII',0,4*len(names),desc,cd)+name_desc+strings+chunk_desc+data
    node=struct.pack('<II',0,len(payload))+payload
    header=HeaderChunk();header.save_ver=277;header.game_ver=2500;header.date='2026-01-01';header.time='00:00:00.000'
    table=DataChunkTableChunk();table.capacity=256;offset=len(header)+len(table);chunk=DataChunk(data=node)
    table.info=[ChunkInfo(offset,len(chunk),len(node))];nodes=NodeTableChunk();nodes.info=[NodeInfo(b'ScriptableSystemsContainer',None,None,offset,len(node))];nodes.offset=offset+len(chunk)
    folder.mkdir(parents=True,exist_ok=True);(folder/'sav.dat').write_bytes(bytes(header)+bytes(table)+bytes(chunk)+bytes(nodes)+bytes(EndChunk()))
    return folder/'sav.dat'
