#!/usr/bin/env node
// supply-flow.js v5 — Uses pre-projected Americas-centered SVG map from mapshaper
// Projection: equirectangular, lon_0=-90, 1400x700 base canvas
// Auto-crops via viewBox. No polygon math — just overlay nodes on pre-rendered land.
'use strict';
var fs=require('fs'),path=require('path');

var LAND_PATH='M 874 651 881 659 839 661 874 651 Z M 784 623 758 626 777 615 784 623 Z M 494 677 453 673 456 667 440 663 481 660 435 647 524 636 661 639 647 630 759 635 788 629 786 609 825 594 795 612 813 634 750 646 763 650 747 655 823 671 939 660 911 652 981 640 1010 625 1155 622 1181 614 1200 619 1261 604 1317 612 1313 627 1321 629 1368 610 1399 609 1399 676 494 677 Z M 1 609 51 603 117 609 176 602 306 624 316 628 286 646 300 654 272 662 344 676 1 676 1 609 Z M 786 557 797 560 781 563 760 553 786 557 Z M 323 507 324 518 309 529 299 527 323 507 Z M 330 488 345 494 332 510 322 482 330 488 Z M 351 412 763 411 734 372 735 352 750 333 746 316 735 320 710 296 648 277 604 224 625 258 614 252 566 191 565 161 573 165 572 158 555 151 529 122 478 111 460 118 465 110 434 130 410 137 440 119 407 113 406 107 425 96 402 96 711 96 688 107 682 119 730 134 739 149 740 136 752 128 745 120 746 106 779 111 787 122 799 114 833 145 792 153 773 166 797 157 799 168 817 170 796 179 799 172 789 173 775 181 778 186 756 195 755 203 753 196 755 210 734 226 737 250 723 231 674 238 669 261 677 275 711 264 704 286 726 289 730 313 751 314 771 300 771 313 778 301 809 306 828 325 850 332 861 353 911 368 913 383 898 411 1095 411 1103 390 1084 352 1086 333 1066 324 1015 329 985 301 984 263 1026 209 1086 203 1093 205 1090 217 1124 230 1133 220 1181 228 1190 206 1157 206 1151 195 1180 185 1211 185 1192 172 1201 164 1181 176 1169 167 1157 183 1161 188 1137 192 1143 202 1137 207 1125 186 1101 170 1098 177 1121 192 1115 191 1112 200 1084 176 1062 181 1047 202 1029 208 1015 205 1013 181 1044 177 1032 159 1081 140 1081 128 1091 124 1092 138 1132 134 1133 125 1143 126 1140 118 1163 115 1132 112 1133 103 1146 96 1399 96 1399 263 1361 286 1360 308 1351 317 1332 265 1323 267 1307 249 1272 248 1236 232 1251 255 1268 245 1282 261 1264 281 1218 299 1185 233 1181 241 1175 232 1215 302 1223 307 1248 301 1238 327 1202 366 1205 411 1229 409 1241 395 1243 411 1399 413 1243 413 1226 447 1217 434 1222 413 1203 413 1185 425 1187 442 1176 448 1166 469 1126 483 1095 413 898 413 891 433 864 445 841 482 823 480 825 496 797 507 803 513 788 525 793 535 781 545 785 551 772 557 758 551 756 537 767 513 761 516 777 431 776 419 766 413 351 412 Z M 1240 188 1241 202 1259 204 1254 192 1262 189 1245 175 1255 166 1231 175 1240 188 Z M 1 96 350 96 340 97 348 106 287 115 281 135 260 150 257 127 290 105 273 113 260 109 254 118 204 119 176 135 201 145 188 168 147 194 153 212 143 214 138 194 122 197 124 189 110 196 113 203 127 202 114 212 125 225 124 238 102 259 63 271 76 296 60 315 40 296 37 312 53 329 54 343 33 318 29 282 17 286 15 271 7 260 1 263 1 96 Z M 1 411 134 411 145 402 155 406 165 391 183 396 181 408 200 411 205 389 217 411 348 412 217 413 248 457 234 493 220 500 198 496 188 481 183 485 187 476 180 483 161 470 110 484 98 481 93 435 121 424 128 413 1 411 Z M 73 374 101 380 61 375 73 374 Z M 172 352 178 361 189 355 213 363 237 389 214 378 205 384 186 381 187 369 168 364 164 359 171 357 158 352 172 352 Z M 138 342 118 347 121 353 130 350 123 355 130 369 121 358 115 369 118 346 138 342 Z M 62 371 22 327 55 348 62 371 Z M 109 341 114 344 103 364 80 359 75 350 77 340 105 321 114 327 109 341 Z M 142 315 138 326 132 318 125 320 139 310 142 315 Z M 123 276 124 292 133 299 118 290 123 276 Z M 740 260 761 269 720 263 740 260 Z M 199 204 179 218 160 216 157 226 154 219 178 210 200 187 199 204 Z M 210 176 217 180 195 187 203 171 210 176 Z M 832 151 843 167 819 163 832 151 Z M 209 151 213 158 208 156 209 169 203 169 204 137 209 151 Z M 1038 120 1037 131 1055 149 1029 154 1038 138 1026 127 1038 120 Z M 1119 79 1157 72 951 71 947 75 963 76 851 80 837 78 850 74 843 71 771 71 789 79 753 80 689 71 698 80 684 80 676 71 643 71 657 78 607 80 594 76 613 75 590 71 351 70 568 70 560 69 564 59 578 59 601 63 582 70 602 63 663 71 651 66 660 61 671 61 670 71 700 71 716 61 762 71 842 71 822 55 765 45 806 30 877 31 868 27 913 23 1002 32 972 37 981 37 973 42 978 49 965 50 974 59 953 67 964 71 1256 71 1249 68 1266 56 1314 49 1277 59 1266 70 1310 71 1321 64 1346 71 1399 54 1399 79 1160 72 1184 79 1119 79 Z M 1 54 57 46 95 53 76 60 145 62 156 72 197 65 346 73 1 79 1 54 Z M 1093 96 1132 98 1119 104 1122 115 1111 130 1100 133 1090 117 1077 122 1070 116 1069 107 1093 96 Z M 682 49 739 57 701 59 672 50 682 49 Z M 1120 38 1133 41 1111 50 1090 39 1120 38 Z M 40 42 6 36 24 32 40 42 Z M 712 39 697 44 674 37 691 32 712 39 Z';

var MW=1400,MH=700; // base map canvas dimensions
var DRC={manufacturer:'#2b6cb0',assembler:'#6b21a8',oem:'#b45309',distributor:'#0e7490',operator:'#15803d',regulatory:'#9f1239'};
var RLB={manufacturer:'Manufacturer',assembler:'Assembler',oem:'OEM / Integrator',distributor:'Distributor',operator:'Operator / Buyer',regulatory:'Regulatory'};
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function tw(s,f){return s.length*f*0.56;}

// Projection: eqc lon_0=-90 onto 1400x700
function lonToX(lon){var nl=lon>90?lon-360:lon;return(nl+270)/360*MW;}
function latToY(lat){return(90-lat)/180*MH;}

// Auto-crop: compute viewBox from node positions with padding
function computeViewBox(cfg){
  var N=cfg.nodes||[];if(!N.length)return{vx:0,vy:0,vw:MW,vh:MH};
  var xs=[],ys=[];
  N.forEach(function(n){xs.push(lonToX(n.location.lon));ys.push(latToY(n.location.lat));});
  var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs);
  var minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  var spanX=maxX-minX,spanY=maxY-minY;
  var padX=Math.max(spanX*0.12,50);
  // Vertical: needs room for the map AND a full popover (290px) above or below
  var popH=300;
  var padTop=Math.max(spanY*0.4,40);
  var padBot=popH+20;
  var cx=(minX+maxX)/2;
  var vw=spanX+padX*2;
  var vh=spanY+padTop+padBot;
  if(vw<300)vw=300;if(vh<popH+spanY+60)vh=popH+spanY+60;
  var vx=cx-vw/2;
  var vy=minY-padTop;
  if(vx<-20)vx=-20;if(vy<-10)vy=-10;
  if(vx+vw>MW+20){vx=MW+20-vw;}if(vy+vh>MH+10){vy=MH+10-vh;}
  if(vx<-20)vx=-20;if(vy<-10)vy=-10;
  return{vx:Math.round(vx),vy:Math.round(vy),vw:Math.round(vw),vh:Math.round(vh)};
}

function flowP(x1,y1,x2,y2){var mx=(x1+x2)/2,my=(y1+y2)/2,dx=x2-x1,dy=y2-y1,d=Math.sqrt(dx*dx+dy*dy)||1;
  var off=Math.min(d*.18,40),nx=-dy/d*off,ny=dx/d*off;
  return{d:'M'+x1.toFixed(1)+','+y1.toFixed(1)+' Q'+(mx+nx).toFixed(1)+','+(my+ny).toFixed(1)+' '+x2.toFixed(1)+','+y2.toFixed(1),cx:mx+nx,cy:my+ny};}
function arrH(x1,y1,cx,cy,x2,y2,sz){sz=sz||7;var tx=x2-cx,ty=y2-cy,l=Math.sqrt(tx*tx+ty*ty)||1;
  var ux=tx/l,uy=ty/l,wx=-uy,wy=ux;
  return'M'+x2.toFixed(1)+','+y2.toFixed(1)+' L'+(x2-ux*sz+wx*sz*.4).toFixed(1)+','+(y2-uy*sz+wy*sz*.4).toFixed(1)+' L'+(x2-ux*sz-wx*sz*.4).toFixed(1)+','+(y2-uy*sz-wy*sz*.4).toFixed(1)+' Z';}

// Smart label placement
function placeLabels(N,nP,vb){
  var NR=6,LH=11,PAD=3,placed=[];
  var cands=[{dx:0,dy:NR+5,a:'middle',ab:false},{dx:0,dy:-(NR+5),a:'middle',ab:true},
    {dx:NR+6,dy:-3,a:'start',ab:false},{dx:-(NR+6),dy:-3,a:'end',ab:false},
    {dx:NR+3,dy:NR+1,a:'start',ab:false},{dx:-(NR+3),dy:NR+1,a:'end',ab:false},
    {dx:NR+3,dy:-(NR+1),a:'start',ab:true},{dx:-(NR+3),dy:-(NR+1),a:'end',ab:true}];
  var out=[];
  N.forEach(function(node){var pos=nP[node.id];if(!pos)return;
    var lines=node.label.split('\n'),mW=0;lines.forEach(function(l){var w=tw(l,8.5);if(w>mW)mW=w;});
    mW+=PAD*2;var tH=lines.length*LH+PAD,hasC=!!node.coveredList,bH=hasC?12:0;
    var bS=Infinity,best=null;
    cands.forEach(function(c){var edy=c.dy+(hasC&&!c.ab?bH:0);
      var ry=c.ab?pos.y+edy-tH-bH:pos.y+edy;
      var rx=c.a==='middle'?pos.x-mW/2:c.a==='start'?pos.x+c.dx:pos.x+c.dx-mW;
      var r={x:rx,y:ry,w:mW,h:tH+bH},sc=0;
      if(r.x<vb.vx)sc+=(vb.vx-r.x)*3;if(r.x+r.w>vb.vx+vb.vw)sc+=(r.x+r.w-vb.vx-vb.vw)*3;
      if(r.y<vb.vy)sc+=(vb.vy-r.y)*3;if(r.y+r.h>vb.vy+vb.vh+30)sc+=(r.y+r.h-vb.vy-vb.vh-30)*3;
      placed.forEach(function(pr){var ox=Math.max(0,Math.min(r.x+r.w,pr.x+pr.w)-Math.max(r.x,pr.x));
        var oy=Math.max(0,Math.min(r.y+r.h,pr.y+pr.h)-Math.max(r.y,pr.y));sc+=ox*oy*2;});
      N.forEach(function(o){if(o.id===node.id)return;var op=nP[o.id];if(!op)return;var cr=NR+5;
        var ox=Math.max(0,Math.min(r.x+r.w,op.x+cr)-Math.max(r.x,op.x-cr));
        var oy=Math.max(0,Math.min(r.y+r.h,op.y+cr)-Math.max(r.y,op.y-cr));sc+=ox*oy*2.5;});
      if(sc<bS){bS=sc;best={rect:r,a:c.a,ab:c.ab};}});
    if(best){placed.push(best.rect);
      var tps=[],baseY=best.ab?best.rect.y+bH+LH:best.rect.y+LH;
      var tx2=best.a==='middle'?pos.x:best.a==='start'?best.rect.x+PAD:best.rect.x+best.rect.w-PAD;
      lines.forEach(function(l,i){tps.push({x:tx2,y:baseY+i*LH,text:l});});
      var cb=null;if(hasC)cb={x:best.a==='middle'?pos.x:tx2,y:best.ab?best.rect.y+8:best.rect.y+LH*lines.length+12,a:best.a};
      out.push({nid:node.id,a:best.a,tps:tps,cb:cb});}
  });return out;
}

// Popover — SVG balloon with triangle pointer reaching the dot
function buildPop(node,rc,x,y,vb,nodeId){
  var pw2=240,ph2=280;
  var rr=8; // border radius
  var triW=8; // triangle base half-width at the rect edge
  // Horizontal positioning
  var ol=x>(vb.vx+vb.vw*0.55);
  var bx=ol?x-pw2-12:x+12;
  if(bx<vb.vx+6)bx=vb.vx+6;
  if(bx+pw2>vb.vx+vb.vw-6)bx=vb.vx+vb.vw-pw2-6;
  // Vertical: anchor to bottom band (dot above) or top band (dot below)
  var midY=vb.vy+vb.vh*0.5;
  var popBelow=y<midY; // popup opens below dot
  var topBand=vb.vy+6;
  var botBand=vb.vy+vb.vh-ph2-6;
  var by=popBelow?botBand:topBand;
  // Triangle base x: where it meets the rect edge, clamped to stay on the rect
  var triBaseX=Math.max(bx+rr+triW+2, Math.min(x, bx+pw2-rr-triW-2));
  // Triangle tip: the dot position itself
  var tipX=x, tipY=y;
  var rx=bx,ry=by,rh=ph2,rw=pw2;
  var path;
  if(popBelow){
    // Rect body at ry, triangle on top edge pointing up to dot
    path='M'+(rx+rr)+','+ry
      +' L'+(triBaseX-triW)+','+ry
      +' L'+tipX+','+tipY
      +' L'+(triBaseX+triW)+','+ry
      +' L'+(rx+rw-rr)+','+ry
      +' Q'+(rx+rw)+','+ry+' '+(rx+rw)+','+(ry+rr)
      +' L'+(rx+rw)+','+(ry+rh-rr)
      +' Q'+(rx+rw)+','+(ry+rh)+' '+(rx+rw-rr)+','+(ry+rh)
      +' L'+(rx+rr)+','+(ry+rh)
      +' Q'+rx+','+(ry+rh)+' '+rx+','+(ry+rh-rr)
      +' L'+rx+','+(ry+rr)
      +' Q'+rx+','+ry+' '+(rx+rr)+','+ry
      +' Z';
  }else{
    // Rect body at ry, triangle on bottom edge pointing down to dot
    path='M'+(rx+rr)+','+ry
      +' L'+(rx+rw-rr)+','+ry
      +' Q'+(rx+rw)+','+ry+' '+(rx+rw)+','+(ry+rr)
      +' L'+(rx+rw)+','+(ry+rh-rr)
      +' Q'+(rx+rw)+','+(ry+rh)+' '+(rx+rw-rr)+','+(ry+rh)
      +' L'+(triBaseX+triW)+','+(ry+rh)
      +' L'+tipX+','+tipY
      +' L'+(triBaseX-triW)+','+(ry+rh)
      +' L'+(rx+rr)+','+(ry+rh)
      +' Q'+rx+','+(ry+rh)+' '+rx+','+(ry+rh-rr)
      +' L'+rx+','+(ry+rr)
      +' Q'+rx+','+ry+' '+(rx+rr)+','+ry
      +' Z';
  }
  // Content area for foreignObject (inside the rect)
  var foX=rx+1,foY=ry+1,foW=rw-2,foH=rh-2;

  var rcol=rc[node.role]||'#64748b',rlab=RLB[node.role]||node.role||'';
  var loc=[node.location.city,node.location.country].filter(Boolean).join(', ');
  var i='';
  i+='<div style="display:inline-block;padding:2px 6px;border-radius:3px;background:'+rcol+';color:#fff;font-size:9px;font-weight:600;margin-bottom:4px;">'+esc(rlab)+'</div>';
  i+='<div style="font-weight:700;font-size:12px;color:#0f172a;margin-bottom:2px;">'+esc(node.label.replace(/\n/g,' '))+'</div>';
  if(loc)i+='<div style="font-size:10px;color:#64748b;margin-bottom:5px;">\u{1F4CD} '+esc(loc)+'</div>';
  if(node.details)i+='<div style="font-size:10px;color:#334155;line-height:1.4;margin-bottom:6px;">'+esc(node.details)+'</div>';
  var r=node.riskAssessment;
  if(r){i+='<div style="margin-top:3px;padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;font-size:9.5px;line-height:1.45;">';
    i+='<div style="font-weight:700;font-size:9.5px;color:#475569;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.4px;">\u{1F50D} Risk Assessment</div>';
    if(r.geopoliticalRisk)i+='<div style="margin-bottom:2px;"><b style="color:#334155;">Geopolitical:</b> '+esc(r.geopoliticalRisk)+'</div>';
    if(r.stateOwnership)i+='<div style="margin-bottom:2px;"><b style="color:#334155;">State ownership:</b> '+esc(r.stateOwnership)+'</div>';
    if(r.ownershipAffiliations)i+='<div style="margin-bottom:2px;"><b style="color:#334155;">Ownership ties:</b> '+esc(r.ownershipAffiliations)+'</div>';
    if(r.fccCoveredList)i+='<div style="margin-bottom:2px;"><b style="color:#dc2626;">FCC Covered List:</b> '+esc(r.fccCoveredList)+'</div>';
    if(r.bisEntityList)i+='<div style="margin-bottom:2px;"><b style="color:#b45309;">BIS Entity List:</b> '+esc(r.bisEntityList)+'</div>';
    if(r.cslSearchName){var u='https://www.trade.gov/data-visualization/csl-search#/search?q='+encodeURIComponent(r.cslSearchName);
      i+='<div style="margin-top:3px;"><a href="'+esc(u)+'" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;font-size:9.5px;">\u{1F50E} Search CSL: \u201C'+esc(r.cslSearchName)+'\u201D</a></div>';}
    i+='<div style="margin-top:2px;"><a href="https://www.fcc.gov/supplychain/coveredlist" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;font-size:9.5px;">\u{1F4CB} FCC Covered List</a></div>';
    i+='</div>';}
  if(node.coveredList){i+='<div style="margin-top:5px;padding:5px 6px;background:#fef2f2;border:1px dashed #dc2626;border-radius:5px;"><div style="font-weight:700;font-size:10px;color:#dc2626;margin-bottom:1px;">\u26A0 FCC Covered List Entity</div>';
    if(node.coveredNote)i+='<div style="font-size:9px;color:#991b1b;line-height:1.3;">'+esc(node.coveredNote)+'</div>';i+='</div>';}

  return '<g class="sf-pop" filter="url(#pop-shadow)">'
    +'<path d="'+path+'" fill="#fff" stroke="#e2e8f0" stroke-width="0.8"/>'
    +'<foreignObject x="'+foX.toFixed(1)+'" y="'+foY.toFixed(1)+'" width="'+foW.toFixed(1)+'" height="'+foH.toFixed(1)+'">'
    +'<div xmlns="http://www.w3.org/1999/xhtml" style="padding:10px 12px;font-family:system-ui,-apple-system,sans-serif;max-height:'+foH+'px;overflow-y:auto;">'+i+'</div>'
    +'</foreignObject></g>';
}

function css(){return '\n'+
'.sf-water{fill:#edf2f7}\n.sf-land{fill:#d6d3cd;stroke:#b8b4ae;stroke-width:0.3;stroke-linejoin:round}\n'+
'.sf-grid{stroke:#dde2e8;stroke-width:0.2;fill:none}\n'+
'.sf-flow-path{fill:none;stroke-width:1.6;opacity:0.45;stroke-linecap:round}\n.sf-flow-head{opacity:0.45}\n'+
'.sf-flow-group:hover .sf-flow-path,.sf-flow-group:hover .sf-flow-head{opacity:1;stroke-width:2.2}\n'+
'.sf-flow-label{opacity:0;transition:opacity 0.15s;pointer-events:none}\n.sf-flow-group:hover .sf-flow-label{opacity:1}\n'+
'.sf-node{cursor:pointer;outline:none}\n.sf-node-circle{transition:all 0.15s}\n'+
'.sf-node:hover .sf-node-circle{filter:brightness(1.12)}\n.sf-node:focus .sf-node-circle{stroke-width:2.5;filter:brightness(1.1)}\n'+
'.sf-tip{opacity:0;transition:opacity 0.12s;pointer-events:none}\n.sf-node:hover .sf-tip{opacity:1}\n'+
'.sf-pop{opacity:0;pointer-events:none;transition:opacity 0.18s}\n'+
'.sf-covered .sf-node-circle{stroke:#dc2626;stroke-width:2;stroke-dasharray:4 2.5}\n'+
'.sf-covered:focus .sf-node-circle{stroke:#dc2626;stroke-width:2.5;stroke-dasharray:4 2.5}\n'+
'.sf-covered-badge{font-size:8px;font-family:system-ui,sans-serif;font-weight:700;fill:#dc2626}\n'+
'.sf-node-label{font-size:8.5px;font-family:system-ui,sans-serif;font-weight:600;pointer-events:none}\n'+
'.sf-title{font-size:16px;font-weight:700;fill:#0f172a;font-family:system-ui,sans-serif}\n'+
'.sf-subtitle{font-size:10px;fill:#64748b;font-family:system-ui,sans-serif}\n'+
'.sf-product{font-size:9px;fill:#475569;font-family:system-ui,sans-serif}\n'+
'.sf-hint{font-size:8px;fill:#94a3b8;font-family:system-ui,sans-serif;font-style:italic}\n'+
'.sf-legend-label{font-size:8px;font-family:system-ui,sans-serif}\n'+
'.sf-legend-title{font-size:9px;fill:#0f172a;font-weight:700;font-family:system-ui,sans-serif}\n';}

function buildSVG(cfg){
  var rc=Object.assign({},DRC,cfg.roles||{});
  var N=cfg.nodes||[],F=cfg.flows||[];
  var vb=cfg.map&&cfg.map.autoCrop===false?{vx:0,vy:0,vw:MW,vh:MH}:computeViewBox(cfg);
  var nP={};N.forEach(function(n){nP[n.id]={x:lonToX(n.location.lon),y:latToY(n.location.lat)};});
  var s='';

  // Header (positioned relative to viewBox)
  var hx=vb.vx+8,hy=vb.vy+14;
  s+='<text class="sf-title" x="'+hx+'" y="'+hy+'">'+esc(cfg.title||'')+'</text>';
  if(cfg.subtitle)s+='<text class="sf-subtitle" x="'+hx+'" y="'+(hy+14)+'">'+esc(cfg.subtitle)+'</text>';
  if(cfg.product){var pt=cfg.product.name+(cfg.product.specs?' \u2014 '+cfg.product.specs:'');
    s+='<text class="sf-product" x="'+hx+'" y="'+(hy+(cfg.subtitle?27:14))+'">'+esc(pt)+'</text>';}
  s+='<text class="sf-hint" x="'+(vb.vx+vb.vw-8)+'" y="'+(hy)+'" text-anchor="end">Hover \u00B7 Click for details</text>';

  // SVG filter for popover shadow
  s+='<defs><filter id="pop-shadow" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.12"/></filter></defs>';
  // Map background (full base canvas, viewBox will crop)
  s+='<rect x="0" y="0" width="'+MW+'" height="'+MH+'" class="sf-water"/>';
  // Grid
  var gi=(cfg.map&&cfg.map.gridInterval)||30;
  if(!(cfg.map&&cfg.map.showGrid===false)){
    for(var lon=-270;lon<=90;lon+=gi){var gx=lonToX(lon>90?lon:lon);
      if(lon>=-180&&lon<=180){gx=(lon+270)/360*MW;}else continue;
      s+='<line x1="'+gx.toFixed(1)+'" y1="0" x2="'+gx.toFixed(1)+'" y2="'+MH+'" class="sf-grid"/>';}
    for(var lat=-90;lat<=90;lat+=gi){if(lat===0)continue;var gy=latToY(lat);
      s+='<line x1="0" y1="'+gy.toFixed(1)+'" x2="'+MW+'" y2="'+gy.toFixed(1)+'" class="sf-grid"/>';}}
  // Land
  if(LAND_PATH)s+='<path d="'+LAND_PATH+'" class="sf-land" fill-rule="evenodd"/>';

  // Flows
  F.forEach(function(f){var fp=nP[f.from],tp=nP[f.to];if(!fp||!tp)return;
    var col=f.color||'#64748b',dash=f.dashed?' stroke-dasharray="6 3"':'';
    var pa=flowP(fp.x,fp.y,tp.x,tp.y),ah=arrH(fp.x,fp.y,pa.cx,pa.cy,tp.x,tp.y,7);
    s+='<g class="sf-flow-group"><path d="'+pa.d+'" class="sf-flow-path" stroke="'+esc(col)+'"'+dash+'/><path d="'+ah+'" class="sf-flow-head" fill="'+esc(col)+'"/>';
    if(f.label){var lw=tw(f.label,8)+10;
      s+='<g class="sf-flow-label"><rect x="'+(pa.cx-lw/2).toFixed(1)+'" y="'+(pa.cy-11).toFixed(1)+'" width="'+lw.toFixed(1)+'" height="14" rx="2" fill="#1e293b" opacity="0.9"/><text x="'+pa.cx.toFixed(1)+'" y="'+(pa.cy-1).toFixed(1)+'" text-anchor="middle" fill="#fff" font-size="8" font-family="system-ui,sans-serif">'+esc(f.label)+'</text></g>';}
    s+='</g>';});

  // Labels
  var pls=placeLabels(N,nP,vb),plM={};pls.forEach(function(q){plM[q.nid]=q;});

  // Nodes
  var popups=[];
  N.slice().sort(function(a,b){return(a.coveredList?1:0)-(b.coveredList?1:0);}).forEach(function(node){
    var pos=nP[node.id];if(!pos)return;var color=rc[node.role]||'#64748b',r=5;
    s+='<g class="sf-node'+(node.coveredList?' sf-covered':'')+'" id="node-'+node.id+'" tabindex="0">';
    s+='<circle cx="'+pos.x.toFixed(1)+'" cy="'+pos.y.toFixed(1)+'" r="'+(r+3)+'" fill="'+esc(color)+'" opacity="0.12"/>';
    s+='<circle class="sf-node-circle" cx="'+pos.x.toFixed(1)+'" cy="'+pos.y.toFixed(1)+'" r="'+r+'" fill="'+esc(color)+'" stroke="#fff" stroke-width="1"/>';
    var pl=plM[node.id];if(pl){if(pl.cb)s+='<text class="sf-covered-badge" x="'+pl.cb.x.toFixed(1)+'" y="'+pl.cb.y.toFixed(1)+'" text-anchor="'+pl.cb.a+'">\u26A0 Covered</text>';
      pl.tps.forEach(function(tp){s+='<text class="sf-node-label" x="'+tp.x.toFixed(1)+'" y="'+tp.y.toFixed(1)+'" text-anchor="'+pl.a+'" fill="'+esc(color)+'">'+esc(tp.text)+'</text>';});}
    // Tooltip
    var tt=node.label.replace(/\n/g,' ')+(node.location.city?' \u2014 '+node.location.city:'')+(node.location.country?', '+node.location.country:'');
    var ttw=tw(tt,9)+10,ttx=pos.x-ttw/2,tty=pos.y-r-16;
    s+='<g class="sf-tip"><rect x="'+ttx.toFixed(1)+'" y="'+tty.toFixed(1)+'" width="'+ttw.toFixed(1)+'" height="16" rx="3" fill="#1e293b" opacity="0.92"/><text x="'+pos.x.toFixed(1)+'" y="'+(tty+11).toFixed(1)+'" text-anchor="middle" fill="#fff" font-size="9" font-family="system-ui,sans-serif">'+esc(tt)+'</text></g>';
    s+='</g>';popups.push({id:node.id,html:buildPop(node,rc,pos.x,pos.y,vb,node.id)});});

  // Legend (bottom-left)
  var uR=[],sR={};N.forEach(function(n){if(n.role&&!sR[n.role]){sR[n.role]=true;uR.push(n.role);}});
  var hC=N.some(function(n){return n.coveredList;});
  var lgX=vb.vx+8,lgY=vb.vy+vb.vh-5-(uR.length+(hC?1:0))*13;
  s+='<text class="sf-legend-title" x="'+lgX+'" y="'+lgY+'">Legend</text>';lgY+=13;
  uR.forEach(function(role){var c=rc[role]||'#64748b',lab=RLB[role]||role;
    s+='<circle cx="'+(lgX+5)+'" cy="'+(lgY-3)+'" r="4" fill="'+esc(c)+'"/>';
    s+='<text class="sf-legend-label" x="'+(lgX+13)+'" y="'+lgY+'" fill="'+esc(c)+'">'+esc(lab)+'</text>';lgY+=13;});
  if(hC){lgY+=2;var cl='Covered List Entity';
    s+='<circle cx="'+(lgX+5)+'" cy="'+(lgY-3)+'" r="4" fill="#dc2626" stroke="#dc2626" stroke-width="1" stroke-dasharray="2 1.5"/>';
    s+='<text class="sf-legend-label" x="'+(lgX+13)+'" y="'+lgY+'" fill="#dc2626" font-weight="600">'+esc(cl)+'</text>';}
  // Popover layer (renders on top of all nodes)
  s+='<g class="sf-popovers">';
  popups.forEach(function(p){s+='<g class="sf-pop-wrap" data-for="'+p.id+'">'+p.html+'</g>';});
  s+='</g>';
  return{svg:s,vb:vb,popIds:popups.map(function(p){return p.id;})};
}

function assembleSVG(cfg){
  var r=buildSVG(cfg),vb=r.vb,popIds=r.popIds;
  var hasCss=popIds.map(function(id){return 'svg:has(#node-'+id+':focus) .sf-pop-wrap[data-for="'+id+'"] .sf-pop{opacity:1;pointer-events:auto}';}).join('\n');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.vx+' '+vb.vy+' '+vb.vw+' '+vb.vh+'" width="'+vb.vw+'" height="'+vb.vh+'" style="background:#fff;"><style>'+css()+hasCss+'</style>'+r.svg+'</svg>';
}

// Corporate hierarchy tree rendering — bidirectional: owners ▲ entity ▼ subsidiaries
function buildCard(node){
  var h='<div class="sf-hier-card">';
  h+='<div class="sf-hier-name">'+esc(node.name);
  if(node.share)h+=' <span class="sf-hier-share">('+esc(node.share)+')</span>';
  h+='</div>';
  if(node.role)h+='<div class="sf-hier-role">'+esc(node.role)+'</div>';
  if(node.location)h+='<div class="sf-hier-loc">\u{1F4CD} '+esc(node.location)+'</div>';
  if(node.notes)h+='<div class="sf-hier-notes">'+esc(node.notes)+'</div>';
  if(node.source){
    var surl=typeof node.source==='string'?node.source:node.source.url;
    var slab=typeof node.source==='string'?null:node.source.label;
    if(surl){
      if(!slab){try{slab=new URL(surl).hostname.replace(/^www\./,'');}catch(e){slab='source';}}
      h+='<div class="sf-hier-source"><a href="'+esc(surl)+'" target="_blank" rel="noopener">\u{1F517} '+esc(slab)+'</a></div>';}}
  if(node.highlight){
    var hls=Array.isArray(node.highlight)?node.highlight:
      (typeof node.highlight==='string'?[{text:node.highlight}]:[node.highlight]);
    hls.forEach(function(hl){
      var txt=typeof hl==='string'?hl:hl.text;
      var tier=typeof hl==='string'?'':hl.tier||'';
      var cls='sf-hier-hl';
      if(tier==='state')cls+=' sf-hl-state';
      else if(tier==='fcc')cls+=' sf-hl-fcc';
      else if(tier==='doc')cls+=' sf-hl-doc';
      h+='<div class="'+cls+'">'+esc(txt)+'</div>';
    });
  }
  h+='</div>';return h;
}
function buildSubNode(node){
  var h='<div class="sf-hier-node">'+buildCard(node);
  if(node.subsidiaries&&node.subsidiaries.length){
    h+='<div class="sf-hier-tree">';
    node.subsidiaries.forEach(function(s){h+=buildSubNode(s);});
    h+='</div>';}
  return h+'</div>';
}
function buildOwnerNode(node){
  var h='<div class="sf-hier-node">'+buildCard(node);
  if(node.owners&&node.owners.length){
    h+='<div class="sf-hier-tree">';
    node.owners.forEach(function(o){h+=buildOwnerNode(o);});
    h+='</div>';}
  return h+'</div>';
}
var _tid=0;
var EMPTY_OWN='<div class="sf-hier-tree"><div class="sf-hier-node"><div class="sf-hier-card sf-hier-empty">No publicly known owners</div></div></div>';
var EMPTY_SUB='<div class="sf-hier-tree"><div class="sf-hier-node"><div class="sf-hier-card sf-hier-empty">No publicly known subsidiaries</div></div></div>';
var TIER_RANK={state:3,fcc:2,doc:1,info:0};
var TIER_TAB={state:' sf-tab-state',fcc:' sf-tab-fcc',doc:' sf-tab-doc',info:' sf-tab-info'};
function nodeMaxTier(node){
  var hl=node.highlight;
  if(!hl)return -1;
  var hls=Array.isArray(hl)?hl:(typeof hl==='string'?[{text:hl}]:[hl]);
  var mx=-1;
  hls.forEach(function(h){
    var t=(typeof h==='string'?'info':h.tier||'info');
    var r=TIER_RANK[t]!=null?TIER_RANK[t]:0;
    if(r>mx)mx=r;
  });
  return mx;
}
function treeMaxTier(nodes,field){
  if(!nodes)return -1;
  var mx=-1;
  for(var i=0;i<nodes.length;i++){
    var n=nodeMaxTier(nodes[i]);
    if(n>mx)mx=n;
    var c=treeMaxTier(nodes[i][field],field);
    if(c>mx)mx=c;
  }
  return mx;
}
function tierToClass(rank){
  if(rank>=3)return TIER_TAB.state;
  if(rank>=2)return TIER_TAB.fcc;
  if(rank>=1)return TIER_TAB.doc;
  if(rank>=0)return TIER_TAB.info;
  return '';
}
function buildEntityBlock(entity){
  var hasOwn=entity.owners&&entity.owners.length;
  var hasSub=entity.subsidiaries&&entity.subsidiaries.length;
  var gid='sf-g'+(++_tid);
  var ownTier=treeMaxTier(entity.owners,'owners');
  var subTier=treeMaxTier(entity.subsidiaries,'subsidiaries');
  var wO=tierToClass(ownTier), wS=tierToClass(subTier);
  var wSym=' \u26A0';
  var oW=ownTier>=0, sW=subTier>=0;
  var h='<div class="sf-hier-entity">';
  h+='<div class="sf-hier-anchor">'+buildCard(entity)+'</div>';
  h+='<div class="sf-hier-tabs">';
  h+='<input type="radio" name="'+gid+'" id="'+gid+'-own" class="sf-radio sf-radio-own">';
  h+='<input type="radio" name="'+gid+'" id="'+gid+'-col" class="sf-radio sf-radio-col" checked>';
  h+='<input type="radio" name="'+gid+'" id="'+gid+'-sub" class="sf-radio sf-radio-sub">';
  h+='<div class="sf-hier-tabrow">';
  h+='<label for="'+gid+'-sub" class="sf-hier-tab sf-hier-tab-sub'+wS+'"><span class="sf-show-word">Show </span>Subsidiaries'+(sW?wSym:'')+'</label>';
  h+='<label for="'+gid+'-col" class="sf-hier-tab sf-hier-tab-col">';
  h+='<span class="sf-col-txt">Collapse Tree</span>';
  h+='<span class="sf-col-own'+wO+'">Owners'+(oW?wSym:'')+'</span>';
  h+='<span class="sf-col-sub'+wS+'">Subsidiaries'+(sW?wSym:'')+'</span>';
  h+='</label>';
  h+='<label for="'+gid+'-own" class="sf-hier-tab sf-hier-tab-own'+wO+'"><span class="sf-show-word">Show </span>Owners'+(oW?wSym:'')+'</label>';
  h+='</div>';
  // Owner tree panel
  h+='<div class="sf-hier-panel sf-hier-panel-own">';
  if(hasOwn){
    h+='<div class="sf-hier-tree">';
    entity.owners.forEach(function(o){h+=buildOwnerNode(o);});
    h+='</div>';
  } else { h+=EMPTY_OWN; }
  h+='</div>';
  // Subsidiary tree panel
  h+='<div class="sf-hier-panel sf-hier-panel-sub">';
  if(hasSub){
    h+='<div class="sf-hier-tree">';
    entity.subsidiaries.forEach(function(s){h+=buildSubNode(s);});
    h+='</div>';
  } else { h+=EMPTY_SUB; }
  h+='</div>';
  h+='</div>';
  return h+'</div>';
}
function buildHierarchies(cfg){
  var trees=cfg.corporateHierarchies;
  if(!trees||!trees.length)return '';
  _tid=0;
  var h='<div class="sf-hier-section">';
  h+='<div class="sf-hier-title">Corporate Ownership &amp; Subsidiaries</div>';
  h+='<div class="sf-hier-grid">';
  trees.forEach(function(tree){h+=buildEntityBlock(tree);});
  h+='</div></div>';
  return h;
}

function hierCss(){return '\n'+
'.sf-hier-section{padding:20px 0 28px;max-width:1440px;width:100%;font-family:system-ui,-apple-system,sans-serif}\n'+
'.sf-hier-title{font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px}\n'+
'.sf-hier-grid{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start}\n'+
'.sf-hier-entity{flex:0 1 auto;min-width:0;max-width:100%}\n'+
'.sf-hier-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;min-width:180px;max-width:260px;overflow-wrap:break-word}\n'+
'.sf-hier-anchor>.sf-hier-card{border-color:#475569;border-width:2px;background:#f8fafc;max-width:none}\n'+
'.sf-hier-name{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:2px}\n'+
'.sf-hier-share{font-weight:400;color:#64748b}\n'+
'.sf-hier-role{font-size:10px;color:#64748b;margin-bottom:2px}\n'+
'.sf-hier-loc{font-size:9.5px;color:#64748b;margin-bottom:2px}\n'+
'.sf-hier-notes{font-size:9.5px;color:#475569;line-height:1.35}\n'+
'.sf-hier-hl{font-size:9.5px;font-weight:600;margin-top:3px;padding:3px 6px;border-radius:4px;color:#15803d;background:#f0fdf4;border:1px solid #86efac}\n'+
'.sf-hl-state{color:#dc2626;font-weight:800;background:#fef2f2;border-color:#fca5a5}\n'+
'.sf-hl-fcc{color:#b45309;font-weight:600;background:#fffbeb;border-color:#fde68a}\n'+
'.sf-hl-doc{color:#7e22ce;font-weight:600;background:#faf5ff;border-color:#d8b4fe}\n'+
'.sf-hier-source{margin-top:3px}\n'+
'.sf-hier-source a{font-size:9px;color:#2563eb;text-decoration:none}\n'+
'.sf-hier-source a:hover{text-decoration:underline}\n'+
'.sf-hier-empty{color:#94a3b8;font-size:10px;font-style:italic;border-style:dashed}\n'+
/* Radio buttons hidden */
'.sf-radio{display:none}\n'+
'.sf-hier-tabs{margin-top:4px}\n'+
/* Tab row: flex, sub left, col center, own right */
'.sf-hier-tabrow{display:flex;justify-content:space-between;align-items:center;margin-top:4px}\n'+
'.sf-hier-tab{font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;padding:4px 8px;cursor:pointer;user-select:none;border-radius:4px}\n'+
'.sf-hier-tab:hover{color:#64748b}\n'+
'.sf-tab-state{color:#dc2626}\n'+
'.sf-tab-state:hover{color:#b91c1c}\n'+
'.sf-tab-fcc{color:#b45309}\n'+
'.sf-tab-fcc:hover{color:#92400e}\n'+
'.sf-tab-doc{color:#7e22ce}\n'+
'.sf-tab-doc:hover{color:#6b21a8}\n'+
'.sf-tab-info{color:#15803d}\n'+
'.sf-tab-info:hover{color:#166534}\n'+
'.sf-hier-tab-sub{order:1}\n'+
'.sf-hier-tab-col{order:2}\n'+
'.sf-hier-tab-own{order:3}\n'+
/* Hide "Collapse Tree" when collapse radio is checked (default state = trees collapsed) */
'.sf-radio-col:checked~.sf-hier-tabrow .sf-hier-tab-col{display:none}\n'+
/* Collapse label text: hide conditional spans by default, show "Collapse Tree" */
'.sf-col-own,.sf-col-sub{display:none}\n'+
/* When Owners active: hide Owners tab, COLLAPSE grows right, show "Owners" text */
'.sf-radio-own:checked~.sf-hier-tabrow .sf-hier-tab-own{display:none}\n'+
'.sf-radio-own:checked~.sf-hier-tabrow .sf-hier-tab-col{flex-grow:1;text-align:right}\n'+
'.sf-radio-own:checked~.sf-hier-tabrow .sf-col-txt{display:none}\n'+
'.sf-radio-own:checked~.sf-hier-tabrow .sf-col-own{display:inline}\n'+
/* When Subs active: hide Sub tab, COLLAPSE grows left, show "Subsidiaries" text */
'.sf-radio-sub:checked~.sf-hier-tabrow .sf-hier-tab-sub{display:none}\n'+
'.sf-radio-sub:checked~.sf-hier-tabrow .sf-hier-tab-col{flex-grow:1;text-align:left}\n'+
'.sf-radio-sub:checked~.sf-hier-tabrow .sf-col-txt{display:none}\n'+
'.sf-radio-sub:checked~.sf-hier-tabrow .sf-col-sub{display:inline}\n'+
/* Panels: collapsed via max-height so they still contribute to entity width */
'.sf-hier-panel{max-height:0;overflow:hidden;margin-top:0}\n'+
/* Show panels when corresponding radio checked */
'.sf-radio-own:checked~.sf-hier-panel-own{max-height:none;overflow:visible;margin-top:4px}\n'+
'.sf-radio-sub:checked~.sf-hier-panel-sub{max-height:none;overflow:visible;margin-top:4px}\n'+
/* Owner panel: right-aligned */
'.sf-hier-panel-own{text-align:right}\n'+
'.sf-hier-panel-own>.sf-hier-tree{text-align:left;display:inline-block}\n'+
/* === Shared downward tree: left-side connectors (used by subsidiaries) === */
'.sf-hier-tree{margin-left:28px;display:flex;flex-direction:column;gap:0}\n'+
'.sf-hier-tree>.sf-hier-node{padding-left:18px;padding-top:8px;position:relative}\n'+
'.sf-hier-tree>.sf-hier-node::before{content:"";position:absolute;left:0;top:0;height:calc(8px + 28px);width:18px;border-left:2px solid #cbd5e1;border-bottom:2px solid #cbd5e1;border-bottom-left-radius:6px}\n'+
'.sf-hier-tree>.sf-hier-node::after{content:"";position:absolute;left:0;top:0;bottom:0;border-left:2px solid #cbd5e1}\n'+
'.sf-hier-tree>.sf-hier-node:last-child::after{display:none}\n'+
/* === Owner tree overrides: right-side mirrored connectors === */
'.sf-hier-panel-own .sf-hier-tree{margin-left:0;margin-right:28px}\n'+
'.sf-hier-panel-own .sf-hier-node{padding-left:0;padding-right:18px}\n'+
'.sf-hier-panel-own .sf-hier-node::before{left:auto;right:0;border-left:none;border-bottom-left-radius:0;border-right:2px solid #94a3b8;border-bottom-right-radius:6px}\n'+
'.sf-hier-panel-own .sf-hier-node::after{left:auto;right:0;border-left:none;border-right:2px solid #94a3b8}\n'+
'@media(max-width:640px){.sf-hier-grid{flex-direction:column}.sf-hier-card{max-width:none}}\n';}

// Class name minification map — sorted longest-first for safe replacement
var CM={
'sf-hier-panel-own':'_po','sf-hier-panel-sub':'_ps','sf-hier-tab-col':'_tc',
'sf-hier-tab-own':'_to','sf-hier-tab-sub':'_ts','sf-covered-badge':'_cb',
'sf-hier-anchor':'_ha','sf-hier-entity':'_he','sf-hier-section':'_hs',
'sf-hier-tabrow':'_tr','sf-legend-label':'_ll','sf-legend-title':'_lt',
'sf-hier-empty':'_ey','sf-hier-share':'_sh','sf-hier-title':'_ht',
'sf-node-circle':'_nc','sf-node-label':'_nl','sf-flow-group':'_fg',
'sf-flow-label':'_fl','sf-hier-card':'_hc','sf-hier-grid':'_hg',
'sf-hier-name':'_hn','sf-hier-node':'_nd','sf-hier-note':'_no',
'sf-hier-panel':'_hp','sf-hier-role':'_hr','sf-hier-tabs':'_hb','sf-hier-tab':'_tb',
'sf-hier-tree':'_ht2','sf-flow-head':'_fh','sf-flow-path':'_fp',
'sf-hier-loc':'_hl','sf-hier-hl':'_hw','sf-pop-wrap':'_pw',
'sf-radio-col':'_rc','sf-radio-own':'_ro','sf-radio-sub':'_rs',
'sf-show-word':'_sw','sf-tab-state':'_xs','sf-tab-info':'_xi',
'sf-hl-state':'_ws','sf-hier-source':'_so',
'sf-col-own':'_co','sf-col-sub':'_cs','sf-col-txt':'_ct',
'sf-tab-doc':'_xd','sf-tab-fcc':'_xf','sf-hl-doc':'_wd',
'sf-hl-fcc':'_wf','sf-covered':'_cv','sf-popovers':'_pv',
'sf-product':'_pd','sf-subtitle':'_st','sf-hier-notes':'_nn',
'sf-water':'_wa','sf-title':'_ti','sf-radio':'_ra','sf-node':'_nd2',
'sf-hint':'_hi','sf-land':'_la','sf-grid':'_gr','sf-wrap':'_wr',
'sf-pop':'_pp','sf-tip':'_tp'
};
// Build sorted keys longest-first, compile regex
var CK=Object.keys(CM).sort(function(a,b){return b.length-a.length;});
var CR=new RegExp(CK.map(function(k){return k.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&');}).join('|'),'g');
function minify(html){
  var out=html.replace(CR,function(m){return CM[m]||m;});
  out=out.replace(/<style>([\s\S]*?)<\/style>/,function(_,css){
    css=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\n+/g,'');
    return '<style>'+css+'</style>';
  });
  out=out.replace(/<!--[\s\S]*?-->/g,'');
  out=out.replace(/\n\s*/g,'');
  return out;
}

function assembleHTML(cfg){
  var hier=buildHierarchies(cfg);
  var extraCss=hier?hierCss():'';
  return minify('<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>'+esc(cfg.title||'Supply Chain Flow')+'</title><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:20px;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center}.sf-wrap{background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:1440px;width:100%;overflow:hidden}.sf-wrap svg{display:block;width:100%;height:auto}@media print{body{padding:0;background:#fff}.sf-wrap{box-shadow:none;border-radius:0}}'+extraCss+'</style></head><body><div class="sf-wrap">'+assembleSVG(cfg)+'</div>'+hier+'</body></html>');
}

/**
 * Generate an interactive HTML diagram from a JSON config object.
 *
 * @param {object} cfg        — The diagram config (same schema as the JSON file).
 * @param {string} [cfgDir]   — Directory for resolving relative paths.
 *                              Defaults to process.cwd().
 * @returns {string}          — Self-contained HTML document.
 */
function generateDiagram(cfg, cfgDir) {
  var args=process.argv.slice(2);
  if(args.length<1){console.error('Usage: node supply-flow.js <config.json> [-o output]');process.exit(1);}
  var cfgPath=args[0],outPath=null;
  for(var i=1;i<args.length;i++){if(args[i]==='-o'&&args[i+1])outPath=args[++i];}
  var cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'));var mode=cfg.output||'html';
  if(!outPath)outPath=path.basename(cfgPath,path.extname(cfgPath))+(mode==='svg'?'.svg':'.html');
  fs.writeFileSync(outPath,mode==='svg'?'<?xml version="1.0" encoding="UTF-8"?>\n'+assembleSVG(cfg):assembleHTML(cfg),'utf8');
  var vb=computeViewBox(cfg);
  console.log('\u2713 Generated: '+outPath);
  console.log('  Nodes: '+(cfg.nodes||[]).length+'  Flows: '+(cfg.flows||[]).length);
  console.log('  ViewBox: '+vb.vx+' '+vb.vy+' '+vb.vw+' '+vb.vh);
  console.log('  Land path: '+(LAND_PATH.length/1024).toFixed(0)+' KB');
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  function usage() {
    console.log(`
Usage: supply-flow <config.json> [-o output.html]

Options:
  -o, --output <file>   Output HTML file (default: derived from config filename)
  -h, --help            Show this help
`);
    process.exit(0);
  }

  const args = process.argv.slice(2);
  if (!args.length || args.includes("-h") || args.includes("--help")) usage();

  var configPath = null;

  for (let i = 0; i < args.length; i++) {
    if (!configPath) {
      configPath = args[i];
    }
  }

  if (!configPath) { console.error("Error: config.json path required."); process.exit(1); }

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.error(`Error reading config: ${e.message}`); process.exit(1);
  }

  generateDiagram(cfg, configPath)
}

module.exports = { generateDiagram };
