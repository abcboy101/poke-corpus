if(!self.define){let s,e={};const n=(n,r)=>(n=new URL(n+".js",r).href,e[n]||new Promise((e=>{if("document"in self){const s=document.createElement("script");s.src=n,s.onload=e,document.head.appendChild(s)}else s=n,importScripts(n),e()})).then((()=>{let s=e[n];if(!s)throw new Error(`Module ${n} didn’t register its module`);return s})));self.define=(r,i)=>{const l=s||("document"in self?document.currentScript.src:"")||location.href;if(e[l])return;let o={};const a=s=>n(s,l),u={module:{uri:l},exports:o,require:a};e[l]=Promise.all(r.map((s=>u[s]||a(s)))).then((s=>(i(...s),o)))}}define(["./workbox-5ffe50d4"],(function(s){"use strict";self.skipWaiting(),s.clientsClaim(),s.precacheAndRoute([{url:"assets/CacheManager-AlMvbWhR.js",revision:null},{url:"assets/CacheManager-DCz-erdP.css",revision:null},{url:"assets/cacheManagerWorker-iyKYnKR9.js",revision:null},{url:"assets/i18n-de-DP7ojUQr.js",revision:null},{url:"assets/i18n-en-Ban8-k7o.js",revision:null},{url:"assets/i18n-es-ckx2TuW4.js",revision:null},{url:"assets/i18n-fr--X3nN0YR.js",revision:null},{url:"assets/i18n-it-BWhKeG--.js",revision:null},{url:"assets/i18n-ja-DDpmU2_a.js",revision:null},{url:"assets/i18n-ko-B-lIEEXK.js",revision:null},{url:"assets/i18n-zh-Bb9FunP9.js",revision:null},{url:"assets/index-DV2VOZe0.css",revision:null},{url:"assets/index-q0qDMsVI.js",revision:null},{url:"assets/react-dom-4R9eBt6z.js",revision:null},{url:"assets/searchWorker-tOlyl36r.js",revision:null},{url:"assets/searchWorkerManager-CGu899lU.js",revision:null},{url:"assets/vendor-DvVG6RcB.js",revision:null},{url:"assets/workbox-window.prod.es5-B9K5rw8f.js",revision:null},{url:"favicon.ico",revision:"24e03661810bd7a53057f9d1ce6532c3"},{url:"index.html",revision:"baaceff41ccce1f4bec5a35ea0dcb7a6"},{url:"logo.svg",revision:"e95681c5db484123e4b73eb1747c4e68"},{url:"logo192-maskable.png",revision:"8e2be3cd6b2c68e7563afdc10915766a"},{url:"logo192.png",revision:"ca8c7a2c3899d5f66cb4d3a103b5f668"},{url:"logo512-maskable.png",revision:"ad9c76f0d98773cda247dda806329c94"},{url:"logo512.png",revision:"07a21f06fb32d4ef6b4f268ac2c001c1"},{url:"manifest.json",revision:"ecaebc2e9e4e259b2b5d8a3abdb07b8e"},{url:"sprites.svg",revision:"cfd9c37197d6d3b9583eb5dc190da963"}],{}),s.cleanupOutdatedCaches(),s.registerRoute(new s.NavigationRoute(s.createHandlerBoundToURL("index.html")))}));