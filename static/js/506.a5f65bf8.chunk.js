"use strict";(self.webpackChunkpoke_corpus=self.webpackChunkpoke_corpus||[]).push([[506],{506:()=>{var t={},n=Uint8Array,r=Uint16Array,e=Int32Array,i=new n([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),a=new n([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),o=new n([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),s=function(t,n){for(var i=new r(31),a=0;a<31;++a)i[a]=n+=1<<t[a-1];var o=new e(i[30]);for(a=1;a<30;++a)for(var s=i[a];s<i[a+1];++s)o[s]=s-i[a]<<5|a;return{b:i,r:o}},f=s(i,2),u=f.b,h=f.r;u[28]=258,h[258]=28;for(var c=s(a,0),l=c.b,v=c.r,p=new r(32768),d=0;d<32768;++d){var g=(43690&d)>>1|(21845&d)<<1;g=(61680&(g=(52428&g)>>2|(13107&g)<<2))>>4|(3855&g)<<4,p[d]=((65280&g)>>8|(255&g)<<8)>>1}var y=function(t,n,e){for(var i=t.length,a=0,o=new r(n);a<i;++a)t[a]&&++o[t[a]-1];var s,f=new r(n);for(a=1;a<n;++a)f[a]=f[a-1]+o[a-1]<<1;if(e){s=new r(1<<n);var u=15-n;for(a=0;a<i;++a)if(t[a])for(var h=a<<4|t[a],c=n-t[a],l=f[t[a]-1]++<<c,v=l|(1<<c)-1;l<=v;++l)s[p[l]>>u]=h}else for(s=new r(i),a=0;a<i;++a)t[a]&&(s[a]=p[f[t[a]-1]++]>>15-t[a]);return s},w=new n(288);for(d=0;d<144;++d)w[d]=8;for(d=144;d<256;++d)w[d]=9;for(d=256;d<280;++d)w[d]=7;for(d=280;d<288;++d)w[d]=8;var b=new n(32);for(d=0;d<32;++d)b[d]=5;var m=y(w,9,0),k=y(w,9,1),M=y(b,5,0),z=y(b,5,1),x=function(t){for(var n=t[0],r=1;r<t.length;++r)t[r]>n&&(n=t[r]);return n},T=function(t,n,r){var e=n/8|0;return(t[e]|t[e+1]<<8)>>(7&n)&r},A=function(t,n){var r=n/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(7&n)},S=function(t){return(t+7)/8|0},E=function(t,r,e){return(null==r||r<0)&&(r=0),(null==e||e>t.length)&&(e=t.length),new n(t.subarray(r,e))},U=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],O=function(t,n,r){var e=new Error(n||U[t]);if(e.code=t,Error.captureStackTrace&&Error.captureStackTrace(e,O),!r)throw e;return e},D=function(t,r,e,s){var f=t.length,h=s?s.length:0;if(!f||r.f&&!r.l)return e||new n(0);var c=!e,v=c||2!=r.i,p=r.i;c&&(e=new n(3*f));var d=function(t){var r=e.length;if(t>r){var i=new n(Math.max(2*r,t));i.set(e),e=i}},g=r.f||0,w=r.p||0,b=r.b||0,m=r.l,M=r.d,U=r.m,D=r.n,C=8*f;do{if(!m){g=T(t,w,1);var B=T(t,w+1,3);if(w+=3,!B){var L=t[(G=S(w)+4)-4]|t[G-3]<<8,q=G+L;if(q>f){p&&O(0);break}v&&d(b+L),e.set(t.subarray(G,q),b),r.b=b+=L,r.p=w=8*q,r.f=g;continue}if(1==B)m=k,M=z,U=9,D=5;else if(2==B){var F=T(t,w,31)+257,$=T(t,w+10,15)+4,I=F+T(t,w+5,31)+1;w+=14;for(var j=new n(I),R=new n(19),V=0;V<$;++V)R[o[V]]=T(t,w+3*V,7);w+=3*$;var W=x(R),_=(1<<W)-1,P=y(R,W,1);for(V=0;V<I;){var G,H=P[T(t,w,_)];if(w+=15&H,(G=H>>4)<16)j[V++]=G;else{var J=0,K=0;for(16==G?(K=3+T(t,w,3),w+=2,J=j[V-1]):17==G?(K=3+T(t,w,7),w+=3):18==G&&(K=11+T(t,w,127),w+=7);K--;)j[V++]=J}}var N=j.subarray(0,F),Q=j.subarray(F);U=x(N),D=x(Q),m=y(N,U,1),M=y(Q,D,1)}else O(1);if(w>C){p&&O(0);break}}v&&d(b+131072);for(var X=(1<<U)-1,Y=(1<<D)-1,Z=w;;Z=w){var tt=(J=m[A(t,w)&X])>>4;if((w+=15&J)>C){p&&O(0);break}if(J||O(2),tt<256)e[b++]=tt;else{if(256==tt){Z=w,m=null;break}var nt=tt-254;if(tt>264){var rt=i[V=tt-257];nt=T(t,w,(1<<rt)-1)+u[V],w+=rt}var et=M[A(t,w)&Y],it=et>>4;et||O(3),w+=15&et;Q=l[it];if(it>3){rt=a[it];Q+=A(t,w)&(1<<rt)-1,w+=rt}if(w>C){p&&O(0);break}v&&d(b+131072);var at=b+nt;if(b<Q){var ot=h-Q,st=Math.min(Q,at);for(ot+b<0&&O(3);b<st;++b)e[b]=s[ot+b]}for(;b<at;++b)e[b]=e[b-Q]}}r.l=m,r.p=Z,r.b=b,r.f=g,m&&(g=1,r.m=U,r.d=M,r.n=D)}while(!g);return b!=e.length&&c?E(e,0,b):e.subarray(0,b)},C=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8},B=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8,t[e+2]|=r>>16},L=function(t,e){for(var i=[],a=0;a<t.length;++a)t[a]&&i.push({s:a,f:t[a]});var o=i.length,s=i.slice();if(!o)return{t:V,l:0};if(1==o){var f=new n(i[0].s+1);return f[i[0].s]=1,{t:f,l:1}}i.sort((function(t,n){return t.f-n.f})),i.push({s:-1,f:25001});var u=i[0],h=i[1],c=0,l=1,v=2;for(i[0]={s:-1,f:u.f+h.f,l:u,r:h};l!=o-1;)u=i[i[c].f<i[v].f?c++:v++],h=i[c!=l&&i[c].f<i[v].f?c++:v++],i[l++]={s:-1,f:u.f+h.f,l:u,r:h};var p=s[0].s;for(a=1;a<o;++a)s[a].s>p&&(p=s[a].s);var d=new r(p+1),g=q(i[l-1],d,0);if(g>e){a=0;var y=0,w=g-e,b=1<<w;for(s.sort((function(t,n){return d[n.s]-d[t.s]||t.f-n.f}));a<o;++a){var m=s[a].s;if(!(d[m]>e))break;y+=b-(1<<g-d[m]),d[m]=e}for(y>>=w;y>0;){var k=s[a].s;d[k]<e?y-=1<<e-d[k]++-1:++a}for(;a>=0&&y;--a){var M=s[a].s;d[M]==e&&(--d[M],++y)}g=e}return{t:new n(d),l:g}},q=function(t,n,r){return-1==t.s?Math.max(q(t.l,n,r+1),q(t.r,n,r+1)):n[t.s]=r},F=function(t){for(var n=t.length;n&&!t[--n];);for(var e=new r(++n),i=0,a=t[0],o=1,s=function(t){e[i++]=t},f=1;f<=n;++f)if(t[f]==a&&f!=n)++o;else{if(!a&&o>2){for(;o>138;o-=138)s(32754);o>2&&(s(o>10?o-11<<5|28690:o-3<<5|12305),o=0)}else if(o>3){for(s(a),--o;o>6;o-=6)s(8304);o>2&&(s(o-3<<5|8208),o=0)}for(;o--;)s(a);o=1,a=t[f]}return{c:e.subarray(0,i),n:n}},$=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},I=function(t,n,r){var e=r.length,i=S(n+2);t[i]=255&e,t[i+1]=e>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var a=0;a<e;++a)t[i+a+4]=r[a];return 8*(i+4+e)},j=function(t,n,e,s,f,u,h,c,l,v,p){C(n,p++,e),++f[256];for(var d=L(f,15),g=d.t,k=d.l,z=L(u,15),x=z.t,T=z.l,A=F(g),S=A.c,E=A.n,U=F(x),O=U.c,D=U.n,q=new r(19),j=0;j<S.length;++j)++q[31&S[j]];for(j=0;j<O.length;++j)++q[31&O[j]];for(var R=L(q,7),V=R.t,W=R.l,_=19;_>4&&!V[o[_-1]];--_);var P,G,H,J,K=v+5<<3,N=$(f,w)+$(u,b)+h,Q=$(f,g)+$(u,x)+h+14+3*_+$(q,V)+2*q[16]+3*q[17]+7*q[18];if(l>=0&&K<=N&&K<=Q)return I(n,p,t.subarray(l,l+v));if(C(n,p,1+(Q<N)),p+=2,Q<N){P=y(g,k,0),G=g,H=y(x,T,0),J=x;var X=y(V,W,0);C(n,p,E-257),C(n,p+5,D-1),C(n,p+10,_-4),p+=14;for(j=0;j<_;++j)C(n,p+3*j,V[o[j]]);p+=3*_;for(var Y=[S,O],Z=0;Z<2;++Z){var tt=Y[Z];for(j=0;j<tt.length;++j){var nt=31&tt[j];C(n,p,X[nt]),p+=V[nt],nt>15&&(C(n,p,tt[j]>>5&127),p+=tt[j]>>12)}}}else P=m,G=w,H=M,J=b;for(j=0;j<c;++j){var rt=s[j];if(rt>255){B(n,p,P[(nt=rt>>18&31)+257]),p+=G[nt+257],nt>7&&(C(n,p,rt>>23&31),p+=i[nt]);var et=31&rt;B(n,p,H[et]),p+=J[et],et>3&&(B(n,p,rt>>5&8191),p+=a[et])}else B(n,p,P[rt]),p+=G[rt]}return B(n,p,P[256]),p+G[256]},R=new e([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),V=new n(0),W=function(t,o,s,f,u,c){var l=c.z||t.length,p=new n(f+l+5*(1+Math.ceil(l/7e3))+u),d=p.subarray(f,p.length-u),g=c.l,y=7&(c.r||0);if(o){y&&(d[0]=c.r>>3);for(var w=R[o-1],b=w>>13,m=8191&w,k=(1<<s)-1,M=c.p||new r(32768),z=c.h||new r(k+1),x=Math.ceil(s/3),T=2*x,A=function(n){return(t[n]^t[n+1]<<x^t[n+2]<<T)&k},U=new e(25e3),O=new r(288),D=new r(32),C=0,B=0,L=c.i||0,q=0,F=c.w||0,$=0;L+2<l;++L){var V=A(L),W=32767&L,_=z[V];if(M[W]=_,z[V]=W,F<=L){var P=l-L;if((C>7e3||q>24576)&&(P>423||!g)){y=j(t,d,0,U,O,D,B,q,$,L-$,y),q=C=B=0,$=L;for(var G=0;G<286;++G)O[G]=0;for(G=0;G<30;++G)D[G]=0}var H=2,J=0,K=m,N=W-_&32767;if(P>2&&V==A(L-N))for(var Q=Math.min(b,P)-1,X=Math.min(32767,L),Y=Math.min(258,P);N<=X&&--K&&W!=_;){if(t[L+H]==t[L+H-N]){for(var Z=0;Z<Y&&t[L+Z]==t[L+Z-N];++Z);if(Z>H){if(H=Z,J=N,Z>Q)break;var tt=Math.min(N,Z-2),nt=0;for(G=0;G<tt;++G){var rt=L-N+G&32767,et=rt-M[rt]&32767;et>nt&&(nt=et,_=rt)}}}N+=(W=_)-(_=M[W])&32767}if(J){U[q++]=268435456|h[H]<<18|v[J];var it=31&h[H],at=31&v[J];B+=i[it]+a[at],++O[257+it],++D[at],F=L+H,++C}else U[q++]=t[L],++O[t[L]]}}for(L=Math.max(L,F);L<l;++L)U[q++]=t[L],++O[t[L]];y=j(t,d,g,U,O,D,B,q,$,L-$,y),g||(c.r=7&y|d[y/8|0]<<3,y-=7,c.h=z,c.p=M,c.i=L,c.w=F)}else{for(L=c.w||0;L<l+g;L+=65535){var ot=L+65535;ot>=l&&(d[y/8|0]=g,ot=l),y=I(d,y+1,t.subarray(L,ot))}c.i=l}return E(p,0,f+S(y)+u)},_=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,e=9;--e;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),P=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=_[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}},G=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,a=0|r.length,o=0;o!=a;){for(var s=Math.min(o+2655,a);o<s;++o)i+=e+=r[o];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},H=function(t,r,e,i,a){if(!a&&(a={l:1},r.dictionary)){var o=r.dictionary.subarray(-32768),s=new n(o.length+t.length);s.set(o),s.set(t,o.length),t=s,a.w=o.length}return W(t,null==r.level?6:r.level,null==r.mem?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(t.length)))):12+r.mem,e,i,a)},J=function(t,n){var r={};for(var e in t)r[e]=t[e];for(var e in n)r[e]=n[e];return r},K=function(t,n,r){for(var e=t(),i=t.toString(),a=i.slice(i.indexOf("[")+1,i.lastIndexOf("]")).replace(/\s+/g,"").split(","),o=0;o<e.length;++o){var s=e[o],f=a[o];if("function"==typeof s){n+=";"+f+"=";var u=s.toString();if(s.prototype)if(-1!=u.indexOf("[native code]")){var h=u.indexOf(" ",8)+1;n+=u.slice(h,u.indexOf("(",h))}else for(var c in n+=u,s.prototype)n+=";"+f+".prototype."+c+"="+s.prototype[c].toString();else n+=u}else r[f]=s}return n},N=[],Q=function(n,r,e,i){if(!N[e]){for(var a="",o={},s=n.length-1,f=0;f<s;++f)a=K(n[f],a,o);N[e]={c:K(n[s],a,o),e:o}}var u=J({},N[e].e);return function(n,r,e,i,a){var o=new Worker(t[r]||(t[r]=URL.createObjectURL(new Blob([n+';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],{type:"text/javascript"}))));return o.onmessage=function(t){var n=t.data,r=n.$e$;if(r){var e=new Error(r[0]);e.code=r[1],e.stack=r[2],a(e,null)}else a(null,n)},o.postMessage(e,i),o}(N[e].c+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+r.toString()+"}",e,u,function(t){var n=[];for(var r in t)t[r].buffer&&n.push((t[r]=new t[r].constructor(t[r])).buffer);return n}(u),i)},X=function(){return[n,r,e,i,a,o,u,l,k,z,p,U,y,x,T,A,S,E,O,D,mt,et,it]},Y=function(){return[n,r,e,i,a,o,h,v,m,w,M,b,p,R,V,y,C,B,L,q,F,$,I,j,S,E,W,H,yt,et]},Z=function(){return[ft,ct,st,P,_]},tt=function(){return[ut,ht]},nt=function(){return[lt,st,G]},rt=function(){return[vt]},et=function(t){return postMessage(t,[t.buffer])},it=function(t){return t&&{out:t.size&&new n(t.size),dictionary:t.dictionary}},at=function(t){return t.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(n){return t.push(n.data[0],n.data[1])}},ot=function(t,n,r,e,i,a){var o,s=Q(t,e,i,(function(t,r){t?(s.terminate(),n.ondata.call(n,t)):Array.isArray(r)?(r[1]&&s.terminate(),n.ondata.call(n,t,r[0],r[1])):a(r)}));s.postMessage(r),n.push=function(t,r){n.ondata||O(5),o&&n.ondata(O(4,0,1),null,!!r),s.postMessage([t,o=r],[t.buffer])},n.terminate=function(){s.terminate()}},st=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},ft=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&st(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}},ut=function(t){31==t[0]&&139==t[1]&&8==t[2]||O(6,"invalid gzip data");var n=t[3],r=10;4&n&&(r+=2+(t[10]|t[11]<<8));for(var e=(n>>3&1)+(n>>4&1);e>0;e-=!t[r++]);return r+(2&n)},ht=function(t){var n=t.length;return(t[n-4]|t[n-3]<<8|t[n-2]<<16|t[n-1]<<24)>>>0},ct=function(t){return 10+(t.filename?t.filename.length+1:0)},lt=function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=e<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var i=G();i.p(n.dictionary),st(t,2,i.d())}},vt=function(t,n){return(8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31)&&O(6,"invalid zlib data"),(t[1]>>5&1)==+!n&&O(6,"invalid zlib data: "+(32&t[1]?"need":"unexpected")+" dictionary"),2+(t[1]>>3&4)};function pt(t,n){return"function"==typeof t&&(n=t,t={}),this.ondata=n,t}var dt=function(){function t(t,r){if("function"==typeof t&&(r=t,t={}),this.ondata=r,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new n(98304),this.o.dictionary){var e=this.o.dictionary.subarray(-32768);this.b.set(e,32768-e.length),this.s.i=32768-e.length}}return t.prototype.p=function(t,n){this.ondata(H(t,this.o,0,0,this.s),n)},t.prototype.push=function(t,r){this.ondata||O(5),this.s.l&&O(4);var e=t.length+this.s.z;if(e>this.b.length){if(e>2*this.b.length-32768){var i=new n(-32768&e);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;a&&(this.b.set(t.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1)),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(a),32768),this.s.z=t.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2)},t}(),gt=function(){return function(t,n){ot([Y,function(){return[at,dt]}],this,pt.call(this,t,n),(function(t){var n=new dt(t.data);onmessage=at(n)}),6)}}();function yt(t,n){return H(t,n||{},0,0)}var wt=function(){function t(t,r){"function"==typeof t&&(r=t,t={}),this.ondata=r;var e=t&&t.dictionary&&t.dictionary.subarray(-32768);this.s={i:0,b:e?e.length:0},this.o=new n(32768),this.p=new n(0),e&&this.o.set(e)}return t.prototype.e=function(t){if(this.ondata||O(5),this.d&&O(4),this.p.length){if(t.length){var r=new n(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length),this.p=r}}else this.p=t},t.prototype.c=function(t){this.s.i=+(this.d=t||!1);var n=this.s.b,r=D(this.p,this.s,this.o);this.ondata(E(r,n,this.s.b),this.d),this.o=E(r,this.s.b-32768),this.s.b=this.o.length,this.p=E(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(t,n){this.e(t),this.c(n)},t}(),bt=function(){return function(t,n){ot([X,function(){return[at,wt]}],this,pt.call(this,t,n),(function(t){var n=new wt(t.data);onmessage=at(n)}),7)}}();function mt(t,n){return D(t,{i:2},n&&n.out,n&&n.dictionary)}var kt=function(){function t(t,n){this.c=P(),this.l=0,this.v=1,dt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),this.l+=t.length,dt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=H(t,this.o,this.v&&ct(this.o),n&&8,this.s);this.v&&(ft(r,this.o),this.v=0),n&&(st(r,r.length-8,this.c.d()),st(r,r.length-4,this.l)),this.ondata(r,n)},t}(),Mt=function(){return function(t,n){ot([Y,Z,function(){return[at,dt,kt]}],this,pt.call(this,t,n),(function(t){var n=new kt(t.data);onmessage=at(n)}),8)}}();var zt=function(){function t(t,n){this.v=1,this.r=0,wt.call(this,t,n)}return t.prototype.push=function(t,r){if(wt.prototype.e.call(this,t),this.r+=t.length,this.v){var e=this.p.subarray(this.v-1),i=e.length>3?ut(e):4;if(i>e.length){if(!r)return}else this.v>1&&this.onmember&&this.onmember(this.r-e.length);this.p=e.subarray(i),this.v=0}wt.prototype.c.call(this,r),this.s.f&&!this.s.l&&(this.v=S(this.s.p)+9,this.s={i:0},this.o=new n(0),this.p.length&&this.push(new n(0),r))},t}(),xt=function(){return function(t,n){var r=this;ot([X,tt,function(){return[at,wt,zt]}],this,pt.call(this,t,n),(function(t){var n=new zt(t.data);n.onmember=function(t){return postMessage(t)},onmessage=at(n)}),9,(function(t){return r.onmember&&r.onmember(t)}))}}();var Tt=function(){function t(t,n){this.c=G(),this.v=1,dt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),dt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=H(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(lt(r,this.o),this.v=0),n&&st(r,r.length-4,this.c.d()),this.ondata(r,n)},t}(),At=function(){return function(t,n){ot([Y,nt,function(){return[at,dt,Tt]}],this,pt.call(this,t,n),(function(t){var n=new Tt(t.data);onmessage=at(n)}),10)}}();var St=function(){function t(t,n){wt.call(this,t,n),this.v=t&&t.dictionary?2:1}return t.prototype.push=function(t,n){if(wt.prototype.e.call(this,t),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(vt(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&O(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),wt.prototype.c.call(this,n)},t}(),Et=function(){return function(t,n){ot([X,rt,function(){return[at,wt,St]}],this,pt.call(this,t,n),(function(t){var n=new St(t.data);onmessage=at(n)}),11)}}();var Ut="undefined"!=typeof TextDecoder&&new TextDecoder;try{Ut.decode(V,{stream:!0}),1}catch($t){}"function"==typeof queueMicrotask?queueMicrotask:"function"==typeof setTimeout&&setTimeout;const Ot=t=>class{constructor(){this.i=new t,this.i.ondata=(t,n)=>{this.ondata(null,t,n)}}push(t,n){try{this.i.push(t,n)}catch(O){this.ondata(O,null,n||!1)}}};let Dt=1;try{(new gt).terminate()}catch(O){Dt=0}const Ct=Dt?{gzip:Mt,deflate:At,"deflate-raw":gt}:{gzip:Ot(kt),deflate:Ot(Tt),"deflate-raw":Ot(dt)},Bt=Dt?{gzip:xt,deflate:Et,"deflate-raw":bt}:{gzip:Ot(zt),deflate:Ot(St),"deflate-raw":Ot(wt)},Lt=(t,n,r)=>class extends t{constructor(t){if(!arguments.length)throw new TypeError("Failed to construct '".concat(r,"': 1 argument required, but only 0 present."));const e=n[t];if(!e)throw new TypeError("Failed to construct '".concat(r,"': Unsupported compression format: '").concat(t,"'"));let i,a=new e;super({start:t=>{a.ondata=(n,r,e)=>{n?t.error(n):r&&(t.enqueue(r),e&&(i?i():t.terminate()))}},transform:t=>{if(t instanceof ArrayBuffer)t=new Uint8Array(t);else{if(!ArrayBuffer.isView(t))throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");t=new Uint8Array(t.buffer,t.byteOffset,t.byteLength)}a.push(t)},flush:()=>new Promise((t=>{i=t,a.push(new Uint8Array(0),!0)}))},{size:t=>0|t.byteLength,highWaterMark:65536})}};const qt="undefined"==typeof globalThis?"undefined"==typeof self?"undefined"==typeof global?{}:global:self:globalThis;var Ft;"undefined"==typeof qt.CompressionStream&&(qt.CompressionStream=(Ft=TransformStream,Lt(Ft,Ct,"CompressionStream"))),"undefined"==typeof qt.DecompressionStream&&(qt.DecompressionStream=function(t){return Lt(t,Bt,"DecompressionStream")}(TransformStream))}}]);
//# sourceMappingURL=506.a5f65bf8.chunk.js.map