!function(){"use strict";var e={};function r(e){return r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r(e)}function t(e){var t=function(e,t){if("object"!==r(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var s=n.call(e,t||"default");if("object"!==r(s))return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"===r(t)?t:String(t)}function n(e,r,n){return(r=t(r))in e?Object.defineProperty(e,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[r]=n,e}function s(e,r){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);r&&(n=n.filter((function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable}))),t.push.apply(t,n)}return t}function a(e){for(var r=1;r<arguments.length;r++){var t=null!=arguments[r]?arguments[r]:{};r%2?s(Object(t),!0).forEach((function(r){n(e,r,t[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):s(Object(t)).forEach((function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))}))}return e}e.m={},e.u=function(e){return"static/js/"+e+".d5fcea94.chunk.js"},e.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},e.p="/poke-corpus/",e.b=self.location+"/../../../";var i=JSON.parse('{"s":{"Red":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":null,"files":["data"]},"Green":{"languages":["ja-Hrkt-JP"],"structured":false,"version":null,"files":["data"]},"Blue":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":null,"files":["data"]},"Yellow":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":null,"files":["data"]},"Gold":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":false,"version":null,"files":["data"]},"Silver":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":false,"version":null,"files":["data"]},"Crystal":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":null,"files":["data"]},"Ruby":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":{"ja-JP":"1.0","en-US":"1.1/1.2","fr-FR":"1.0/1.1","it-IT":"1.0/1.1","de-DE":"1.0/1.1","es-ES":"1.0/1.1"},"files":["data"]},"Sapphire":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":{"ja-JP":"1.0","en-US":"1.1/1.2","fr-FR":"1.0/1.1","it-IT":"1.0/1.1","de-DE":"1.0/1.1","es-ES":"1.0/1.1"},"files":["data"]},"FireRed":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":{"ja-JP":"1.0","en-US":"1.1","fr-FR":"1.0","it-IT":"1.0","de-DE":"1.0","es-ES":"1.0"},"files":["data"]},"LeafGreen":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":{"ja-JP":"1.0","en-US":"1.1","fr-FR":"1.0","it-IT":"1.0","de-DE":"1.0","es-ES":"1.0"},"files":["data"]},"Emerald":{"languages":["ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES"],"structured":false,"version":"1.0","files":["data"]},"DiamondPearl":{"languages":["qid-ZZ","ja-Hrkt-JP","en-US","en-GB","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["msg"]},"Platinum":{"languages":["qid-ZZ","ja-Hrkt-JP","en-US","en-GB","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["msg"]},"HeartGoldSoulSilver":{"languages":["qid-ZZ","ja-Hrkt-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["msg"]},"BlackWhite":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["common","script"]},"Black2White2":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["common","script"]},"XY":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["common","script"]},"OmegaRubyAlphaSapphire":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR"],"structured":true,"version":null,"files":["common","script"]},"SunMoon":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":null,"files":["common","script"]},"UltraSunUltraMoon":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":null,"files":["common","script"]},"LetsGoPikachuLetsGoEevee":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":null,"files":["common","script"]},"SwordShield":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":"1.3.0","files":["common","script"]},"BrilliantDiamondShiningPearl":{"languages":["ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":"1.3.0","files":["message"]},"LegendsArceus":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":"1.1.0","files":["common","script"]},"ScarletViolet":{"languages":["qid-ZZ","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":"1.3.2","files":["common","script"]},"Bank":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":"1.4","files":["turtle"]},"HOME":{"languages":["qid-ZZ","ja-Hrkt-JP","ja-JP","en-US","fr-FR","it-IT","de-DE","es-ES","ko-KR","zh-CN","zh-TW"],"structured":true,"version":"3.0.0","files":["megaturtle"]}}}');self.onmessage=function(r){var t=function(e,r,t,n){postMessage({complete:!1,status:e,progress:.49*r+.49*t+.01*n,results:[]})},n=function(e){postMessage({complete:!0,status:e,progress:1,results:arguments.length>1&&void 0!==arguments[1]?arguments[1]:[]})};try{var s=r.data;t("loading",0,0,0);var u=0,o=[];Object.keys(i.s).filter((function(e){return s.collections.includes(e)})).forEach((function(e){var r=i.s[e];s.languages.every((function(e){return!r.languages.includes(e)}))||r.files.filter((function(e){return!("common"===e&&!s.common||"script"===e&&!s.script)})).forEach((function(t){var n=r.structured?r.languages:r.languages.filter((function(e){return s.languages.includes(e)}));r.structured?o.push({index:u,params:s,collectionKey:e,fileKey:t,languages:n}):n.forEach((function(r){o.push({index:u,params:s,collectionKey:e,fileKey:t,languages:[r]})})),u+=n.length}))}));for(var l=0,c=0,f=0,d=[],g=[],S=function(e){var r=e.data;if("loading"===r.status)l++,t("loading",l/u,c/u,f/o.length);else if("processing"===r.status)c++,t("processing",l/u,c/u,f/o.length);else if("done"===r.status){if(d.push(r),f++,t("collecting",l/u,c/u,f/o.length),f===o.length){var s=[];d.sort((function(e,r){return e.index-r.index}));var i="",S="";d.map((function(e){return e.result})).forEach((function(e){s.push(a(a({},e),{},{displayHeader:e.collection!==i||e.file!==S})),i=e.collection,S=e.file})),n("done",s),g.forEach((function(e){return e.terminate()}))}}else n(r.status),g.forEach((function(e){return e.terminate()}))},E=Math.max(1,Math.min(o.length,(navigator.hardwareConcurrency||4)-2)),p=0;p<E;p++){var m=new Worker(new URL(e.p+e.u(534),e.b));m.onmessage=S,g.push(m)}o.forEach((function(e,r){g[r%g.length].postMessage(e)}))}catch(j){console.error(j),n("error")}}}();
//# sourceMappingURL=953.f752b84e.chunk.js.map