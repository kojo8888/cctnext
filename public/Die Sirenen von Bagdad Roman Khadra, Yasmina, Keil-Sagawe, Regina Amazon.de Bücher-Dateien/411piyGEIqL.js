(function(p){var d=window.AmazonUIPageJS||window.P,r=d._namespace||d.attributeErrors,h=r?r("DetailPageLookInsideAssets",""):d;h.guardFatal?h.guardFatal(p)(h,window):h.execute(function(){p(h,window)})})(function(p,d,r){function h(g){d.ue&&d.ue.count&&d.ue.tag&&(ue.count(g,0),ue.tag(E()))}function k(g){if("undefined"!==typeof g){var e=d.ue;if(e&&e.count&&e.tag){var c=e.count(g)||0;e.count(g,c+1);e.tag(E())}}}function E(){var d=/ipad|tablet/i.test(navigator.userAgent);return/mobile/i.test(navigator.userAgent)&&
!d?"mobile":d?"tablet":"desktop"}function V(d,e){var c={};var f=W.COUNT;f={Timestamp:Date.now(),CloudWatchMetrics:[{Namespace:"LITB",Dimensions:[["region"],["marketplace"],["platform"]],Metrics:[{Name:d,Unit:f}]}]};c._aws=f;c.region=e.region;c.marketplace=e.marketplace;c.platform=E();c[d]=1;return{logs:[{level:"info",message:d,context:{emfLog:c,logTime:Date.now()}}]}}p.when("A","jQuery","ebooksImageBlockATF","cf").execute(function(g,e,c){function f(){h("litbReaderIframeSrcNotAvailable");h("litbReaderIframeContentWindowNotAvailable");
h("litbStickerClickedOnKindleBook");h("bookImageClickedOnKindleBook");G();L.addClass("image-2d");if(c&&c.litbData&&c.litbData.hasLitb&&c.litbData.litbReftag){L.addClass("clickableImage");var a=document.getElementById("litb-read-frame");a&&a.dataset&&a.dataset.src?a.src=a.dataset.src:k("litbReaderIframeSrcNotAvailable");c.litbData.showNewDesktopLitb&&a?(x.click(function(a){l(!0);m(a.target)&&(k("litbStickerClickedOnKindleBook"),H.incrementMetric("litbStickerClickedOnKindleBook"))}),d.addEventListener("popstate",
X,!1),d.addEventListener("message",t,!1),u(),a=v(d.location.search),a.asin&&a.format&&l(!1)):x.click(function(a){Q(!0);m(a.target)&&k("litbStickerClickedOnKindleBook")})}e(d).resize(p)}function m(a){return a&&("ebooksSitbLogoImg"===a.getAttribute("id")||"ebooksSitbLogo"===a.getAttribute("id"))}function u(){var a=document.getElementById("litb-read-frame");if(a&&a.contentWindow){if(B){a.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),"*");return}a.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),
"*");if(R>S)return;R++}else a&&k("litbReaderIframeContentWindowNotAvailable");setTimeout(u,T)}function l(a){U++;B?Q(a):U>S||setTimeout(function(){l(a)},T)}function Q(a){k("bookImageClickedOnKindleBook");H.incrementMetric("bookImageClickedOnKindleBook");var b=document.getElementById("litb-read-frame");c.litbData&&c.litbData.showNewDesktopLitb&&b&&b.contentWindow?(a=JSON.stringify({command:"initializeLITB",time:Date.now(),search:d.location.search,newSession:a}),b.contentWindow.postMessage(a,"*"),A(),
b.focus()):(b&&!b.contentWindow&&k("litbReaderIframeContentWindowNotAvailable"),"undefined"!=typeof SitbReader&&SitbReader.LightboxActions.openReader(c.litbData.litbReftag))}function X(){var a=document.getElementById("litb-read-frame");c.litbData&&c.litbData.showNewDesktopLitb&&a&&a.contentWindow?(I||!C()&&!D||(A(),a.contentWindow.postMessage(JSON.stringify({command:"updateLITB",search:d.location.search}),a.src)),I=!1):a&&k("litbReaderIframeContentWindowNotAvailable");D||w()}function A(){var a=document.getElementById("litb-read-frame");
if(a){O=d.scrollY;var b=document.body;b.style.position="fixed";b.style.top="-"+O+"px";b.style.right="0";b.style.left="0";a.style.cssText="position:fixed; width:100%; height:100%; top:0px; left:0px; z-index:1000; display: block; border: 0 none;";D=!0}}function y(a){var b=document.getElementById("litb-read-frame");b&&(b.style.cssText="display: none",b=document.body,b.style.position="",b.style.top="",b.style.right="",b.style.left="",d.scrollTo(0,parseInt(O||"0",10)),D=!1,a&&w())}function w(){C()&&d.history.replaceState({},
document.title,d.location.origin+d.location.pathname+F()+d.location.hash)}function t(a){var b;if(b="string"===typeof a.data)try{JSON.parse(a.data),b=!0}catch(ca){b=!1}b&&(a=JSON.parse(a.data),b=a.command,"closeLITB"===b?a.depth?(I=!0,d.history.go(-1*a.depth),y(!1)):y(!0):"updateLITB"===b&&a.search?(b=v(d.location.search),d.history.pushState({},document.title,d.location.origin+d.location.pathname+z(a.search)+d.location.hash),b.asin!==a.search.asin&&d.dispatchEvent(new PopStateEvent("popstate"))):"readyLITB"===
b?B=!0:"reloadLITB"===b&&d.location.reload())}function G(){var a=K.outerWidth(),b=K.outerHeight(),q=P.outerHeight()-(P.outerHeight()-K.outerHeight())/2;L.width(a).height(b);K.css({position:"relative",top:"0",left:"0"});r.height(q);(d.innerWidth||document.body.offsetWidth)<c.windowWidthThreshold&&p()}function p(){var a=d.innerWidth||document.body.offsetWidth;if(!(0>=a))if(a>c.windowWidthThreshold){a=c.configWidths[1];var b=a/c.holderRatio,q=c.frontImageWidth,H=c.frontImageHeight;J(a,b,q,H)}else a<
c.windowWidthThreshold&&(a=c.configWidths[0],b=a/c.holderRatio,c.frontImageAspectRatio>c.holderRatio?(q=a,H=q/c.frontImageAspectRatio):(H=b,q=H*c.frontImageAspectRatio),J(a,b,q,H))}function J(a,b,d,q){if(0<a&&0<b&&0<d&&0<q){M.length&&E.length&&(M.css("margin-left",a+c.centerColMargin).removeClass("centerColumn"),E.width(a));var H=b+c.containerMargin;x.width(a).height(H);K.width(d).height(q);L.width(d).height(q);r.height(b-(b-K.outerHeight())/2);e(this).trigger("imageResize")}}function v(a){var b=
{};0<a.length&&a.substr(1).split("\x26").forEach(function(a){a=a.split("\x3d");2===a.length&&(b[a[0]]=a[1])});return b}function n(a){var b="";Object.keys(a).forEach(function(d){0<b.length&&(b+="\x26");b+=d+"\x3d"+a[d]});return b}function z(a){if(d.location.search){var b=v(d.location.search);b.asin=a.asin;b.revisionId=a.revisionId;b.format=a.format;b.depth=a.depth;a=n(b)}else a=n(a);return"?"+a}function F(){var a="";d.location.search&&(a=v(d.location.search),delete a.asin,delete a.revisionId,delete a.format,
delete a.depth,a=n(a));return"?"+a}function C(){var a=v(d.location.search);return a.asin&&a.format}var I=!1,B=!1,D=!1,x=e("#ebooksImageBlock"),q=e("#ebooksImgBlkFront"),b=e("#ebooksImgBlockInlineVideo"),a=e("#ebooksImgBlockInlineVideoSrc"),H=new N(g,e,c);if(x.length){var P=x.find("#ebooks-img-wrapper"),r=x.find("#ebooksImageBlockContainer"),L=x.find("#ebooks-img-canvas"),K=L.find(".frontImage"),E=e("#leftCol"),M=e("#centerCol");f()}else throw Error("Element with id imageBlock is missing");g.on("a:image:load",
function(d){b.length&&a.length&&c.hasCoverImageInlineVideo&&(q.hide(),b.show())});g.loadDynamicImage(q);var T=100,S=50,R=0,U=0,O=0});p.when("A","jQuery","ImageBlockATF","cf").execute(function(g,e,c){function f(){var e=d.innerWidth||document.body.offsetWidth;if(!(0>=e))if(e>c.windowWidthThreshold&&l.width()<=c.configWidths[0]){e=c.configWidths[1];var f=e/c.holderRatio,g=c.frontImageWidth,u=c.frontImageHeight;m(e,f,g,u)}else e<c.windowWidthThreshold&&l.width()>c.configWidths[0]&&(e=c.configWidths[0],
f=e/c.holderRatio,c.frontImageAspectRatio>c.holderRatio?(g=e,u=g/c.frontImageAspectRatio):(u=f,g=u*c.frontImageAspectRatio),m(e,f,g,u))}function m(d,f,g,m){if(0<d&&0<f&&0<g&&0<m){J.css("margin-left",d+c.centerColMargin).removeClass("centerColumn");r.css("width",d);var z=f+c.containerMargin+c.flipLinkMinHeight+c.litbHeight;l.css("width",d).css("height",z);u(g,m);h.css("height",f+c.litbHeight-(f+c.litbHeight-t.outerHeight())/2);e(this).trigger("imageResize")}}function u(d,c){t.css("width",d).css("height",
c);d=t.width();c=t.height();A.css("width",d).css("height",c);n.resizeCanvas(d);"undefined"!==typeof y&&0<y.length&&(y.css("width",d).css("height",c),w.css("height",c),isShowing3D&&p&&(c=w.width(),v=(d-c)/2-2,w.removeClass("ieTransition").css("left",(d-c)/2),w.css("transform","perspective(3000px) rotateY(-65deg) translateZ("+v+"px)"),g.delay(function(){w.addClass("ieTransition")},10)))}var l=e("#imageBlock"),k=l.find("#img-wrapper"),h=l.find("#imageBlockContainer"),A=l.find("#img-canvas"),y=A.find(".backImage"),
w=A.find(".sideImage"),t=A.find(".frontImage"),p=e.browser.msie||!!navigator.userAgent.match(/Trident/),r=e("#leftCol"),J=e("#centerCol"),v=0,n=new M(g,e,l,c,!0);n.initializeMetrics();(function(){if(t.offset()){var d=k.outerHeight()-(k.outerHeight()-t.outerHeight())/2,c=w.outerWidth();k.css("position","relative");t.css({position:"relative",top:"0",left:"0"});y.css("position","absolute").css("top","0").css("left","0");w.css("position","absolute").css("top","0").css("left","-"+c+"px");h.css("height",
d)}})();A.addClass("image-2d");n.initializeSticker("front");c.disableResize||e(d).resize(f)});p.when("a-modal-handlers").execute("mark-booksimageblock-interactive-time",function(){"function"===typeof d.markFeatureInteractive&&d.markFeatureInteractive("booksImageBlock",{hasComponents:!0,components:[{name:"thumbnail"}]})});p.when("A","jQuery","MinimalLITBImageBlockATF").execute(function(d,e,c){var f=e("#minimalImageBlock");d=new M(d,e,f,c,!1);d.initializeMetrics();d.initializeSticker(r)});var M=function(){return function(g,
e,c,f,m){function u(){var b=document.getElementById("litb-read-frame");if(b){if(I){b.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),"*");return}b.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),"*");if(50<D)return;D++}setTimeout(u,100)}function l(b,a){x++;I?p(b,a):50<x?k("litbReadyMaxAttempts"):setTimeout(function(){l(b,a)},100)}function p(b,a){k("litbStickerClickedOnPrintBook");F.incrementMetric("litbStickerClickedOnPrintBook");var c=document.getElementById("litb-read-frame");
f.litbData&&f.litbData.showNewDesktopLitb&&c?(b=JSON.stringify({command:"initializeLITB",time:Date.now(),search:d.location.search,newSession:b}),c.contentWindow.postMessage(b,"*"),w(),c.focus()):"undefined"!=typeof SitbReader&&(k("sitbReaderCodePathUsed"),"back"==a&&SitbReader.currentBook&&SitbReader.currentBook.bookmarks?(c=SitbReader.currentBook.bookmarks.getFirstAndLastPageNumberByName("Back Cover").first,b=SitbReader.currentBook.bookmarks.getFirstAndLastPageNumberByName("Back Flap").first,c?SitbReader.LightboxActions.openReaderToPage(c):
b?SitbReader.LightboxActions.openReaderToPage(b):SitbReader.LightboxActions.openReader(f.litbData.litbReftag)):SitbReader.LightboxActions.openReader(f.litbData.litbReftag))}function r(){G()&&d.history.replaceState({},document.title,d.location.origin+d.location.pathname+A()+d.location.hash)}function A(){var b="";d.location.search&&(b=n(d.location.search),delete b.asin,delete b.revisionId,delete b.format,delete b.depth,b=v(b));return"?"+b}function y(b){var a=document.getElementById("litb-read-frame");
a&&(a.style.cssText="display: none",a=document.body,a.style.position="",a.style.top="",a.style.right="",a.style.left="",d.scrollTo(0,parseInt(q||"0",10)),B=!1,b&&r())}function w(){var b=document.getElementById("litb-read-frame");if(b){q=d.scrollY;var a=document.body;a.style.position="fixed";a.style.top="-"+q+"px";a.style.right="0";a.style.left="0";b.style.cssText="position:fixed; width:100%; height:100%; top:0px; left:0px; z-index:1000; display: block; border: 0 none;";B=!0}}function t(){var b=document.getElementById("litb-read-frame");
f.litbData&&f.litbData.showNewDesktopLitb&&b&&(C||!G()&&!B||(w(),b.contentWindow.postMessage(JSON.stringify({command:"updateLITB",search:d.location.search}),b.src)),C=!1);B||r()}function G(){var b=n(d.location.search);return b.asin&&b.format}function E(b){var a;if(a="string"===typeof b.data)try{JSON.parse(b.data),a=!0}catch(H){a=!1}a&&(b=JSON.parse(b.data),a=b.command,"closeLITB"===a?b.depth?(C=!0,d.history.go(-1*b.depth),y(!1)):y(!0):"updateLITB"===a&&b.search?(a=n(d.location.search),d.history.pushState({},
document.title,d.location.origin+d.location.pathname+J(b.search)+d.location.hash),a.asin!==b.search.asin&&d.dispatchEvent(new PopStateEvent("popstate"))):"readyLITB"===a?I=!0:"reloadLITB"===a&&d.location.reload())}function J(b){if(d.location.search){var a=n(d.location.search);a.asin=b.asin;a.revisionId=b.revisionId;a.format=b.format;a.depth=b.depth;b=v(a)}else b=v(b);return"?"+b}function v(b){var a="";Object.keys(b).forEach(function(d){0<a.length&&(a+="\x26");a+=d+"\x3d"+b[d]});return a}function n(b){var a=
{};0<b.length&&b.substr(1).split("\x26").forEach(function(b){b=b.split("\x3d");2===b.length&&(a[b[0]]=b[1])});return a}m={};var z=c.find("#litb-canvas"),F=new N(g,e,f),C=!1,I=!1,B=!1,D=0,x=0,q=0;m.initializeMetrics=function(){h("litbReadyMaxAttempts");h("litbReaderIframeSrcNotAvailable");h("sitbReaderCodePathUsed");h("litbStickerClickedOnPrintBook")};m.initializeSticker=function(b){if(f&&f.litbData&&(f.litbData.hasLitb&&f.litbData.litbReftag||f.litbData.showNewDesktopLitb)){z.addClass("litb-on-click");
z.click(l.bind(this,!0,b));var a=document.getElementById("litb-read-frame");a&&a.dataset&&a.dataset.src?a.src=a.dataset.src:k("litbReaderIframeSrcNotAvailable");f.litbData.showNewDesktopLitb&&a?(d.addEventListener("popstate",t,!1),d.addEventListener("message",E,!1),u(),a=n(d.location.search),a.asin&&a.format&&l(!1,b)):z.click(function(){p(this,!0,b)});a={hasComponents:!0,components:[{name:"mainimage"}]};"function"===typeof d.markFeatureInteractive&&d.markFeatureInteractive("booksImageBlock",a)}};
m.resizeCanvas=function(b){z.css("width",b)};return m}}();p.when("A","jQuery","EbooksReadSample","cf").execute(function(d,e,c){(new Y(d,e,c)).setupInteractions(c)});p.when("A","jQuery","PbooksReadSample","cf").execute(function(d,e,c){var f=e("#imageBlock"),m=e("#pbooksReadSample");(new Z(d,e,f,c,m)).initializeSticker(r)});var Y=function(){return function(g,e,c){function f(){var a=document.getElementById("litb-read-frame");if(a&&a.contentWindow){if(z){a.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),
"*");return}a.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),"*");if(x>D)return;x++}else a&&k("litbReaderIframeContentWindowNotAvailable");setTimeout(f,B)}function m(a){q++;z?u(a):q>D||setTimeout(function(){m(a)},B)}function u(a){a&&(k("readSampleButtonClicked"),I.incrementMetric("readSampleButtonClicked"));var b=document.getElementById("litb-read-frame");b&&!b.contentWindow&&k("litbReaderIframeContentWindowNotAvailable");c.litbData&&c.litbData.showNewDesktopLitb&&b&&b.contentWindow?
(a=JSON.stringify({command:"initializeLITB",time:Date.now(),search:d.location.search,newSession:a}),b.contentWindow.postMessage(a,"*"),h(),b.focus()):c&&c.litbData&&c.litbData.hasLitb&&(d.smash?p.when("mash").execute(function(a){a.navigate({url:c.litbData.litbReaderUrl,transition:"slide"})}):d.location.href=c.litbData.litbReaderUrl)}function l(){var a=document.getElementById("litb-read-frame");c.litbData&&c.litbData.showNewDesktopLitb&&a&&a.contentWindow?(n||!y()&&!F||(h(),a.contentWindow.postMessage(JSON.stringify({command:"updateLITB",
search:d.location.search}),a.src)),n=!1):a&&k("litbReaderIframeContentWindowNotAvailable");F||A()}function h(){var a=document.getElementById("litb-read-frame");if(a){b=d.scrollY;var c=document.body;c.style.position="fixed";c.style.top="-"+b+"px";c.style.right="0";c.style.left="0";a.style.cssText="position:fixed; width:100%; height:100%; top:0px; left:0px; z-index:1000; display: block; border: 0 none;";F=!0}}function r(a){var c=document.getElementById("litb-read-frame");c&&(c.style.cssText="display: none",
c=document.body,c.style.position="",c.style.top="",c.style.right="",c.style.left="",d.scrollTo(0,parseInt(b||"0",10)),F=!1,a&&A())}function A(){y()&&d.history.replaceState({},document.title,d.location.origin+d.location.pathname+J())}function y(){var a=t(d.location.search);return a.asin&&a.format}function w(a){var b;if(b="string"===typeof a.data)try{JSON.parse(a.data),b=!0}catch(P){b=!1}b&&(a=JSON.parse(a.data),b=a.command,"closeLITB"===b?a.depth?(n=!0,d.history.go(-1*a.depth),r(!1)):r(!0):"updateLITB"===
b&&a.search?(b=t(d.location.search),d.history.pushState({},document.title,d.location.origin+d.location.pathname+E(a.search)),b.asin!==a.search.asin&&d.dispatchEvent(new PopStateEvent("popstate"))):"readyLITB"===b&&(z=!0))}function t(a){var b={};0<a.length&&a.substr(1).split("\x26").forEach(function(a){a=a.split("\x3d");2===a.length&&(b[a[0]]=a[1])});return b}function G(a){var b="";Object.keys(a).forEach(function(d){0<b.length&&(b+="\x26");b+=d+"\x3d"+a[d]});return b}function E(a){if(d.location.search){var b=
t(d.location.search);b.asin=a.asin;b.revisionId=a.revisionId;b.format=a.format;b.depth=a.depth;a=G(b)}else a=G(a);return"?"+a}function J(){var a="";d.location.search&&(a=t(d.location.search),delete a.asin,delete a.revisionId,delete a.format,delete a.depth,a=G(a));return"?"+a}var v={},n=!1,z=!1,F=!1,C=e("#ebooksReadSample"),I=new N(g,e,c);v.setupInteractions=function(){if(c&&c.litbData&&c.litbData.hasLitb){var a=document.getElementById("litb-read-frame");a&&a.dataset&&a.dataset.src?a.src=a.dataset.src:
c.litbData.showNewDesktopLitb&&k("litbReaderIframeSrcNotAvailable");c.litbData.showNewDesktopLitb&&a?(C.click(function(a){m(!0)}),d.addEventListener("popstate",l,!1),d.addEventListener("message",w,!1),f(),a=t(d.location.search),a.asin&&a.format&&m(!1)):C.click(function(a){u(!0)})}};var B=100,D=20,x=0,q=0,b=0;return v}}(),Z=function(){return function(g,e,c,f,m){function u(){var d=document.getElementById("litb-read-frame");if(d){if(F){d.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),
"*");return}d.contentWindow.postMessage(JSON.stringify({command:"readyLITB"}),"*");if(50<B)return;B++}setTimeout(u,100)}function l(d,b){D++;F?p(d,b):50<D?k("litbReadyMaxAttempts"):setTimeout(function(){l(d,b)},100)}function p(c){k("printReadSampleButtonClicked");I.incrementMetric("printReadSampleButtonClicked");var b=document.getElementById("litb-read-frame");f.litbData&&f.litbData.showNewDesktopLitb&&b?(c=JSON.stringify({command:"initializeLITB",time:Date.now(),search:d.location.search,newSession:c}),
b.contentWindow.postMessage(c,"*"),w(),b.focus()):d.location.href=f.litbData.litbReaderUrl}function r(){G()&&d.history.replaceState({},document.title,d.location.origin+d.location.pathname+A()+d.location.hash)}function A(){var c="";d.location.search&&(c=n(d.location.search),delete c.asin,delete c.revisionId,delete c.format,delete c.depth,c=v(c));return"?"+c}function y(c){var b=document.getElementById("litb-read-frame");b&&(b.style.cssText="display: none",b=document.body,b.style.position="",b.style.top=
"",b.style.right="",b.style.left="",d.scrollTo(0,parseInt(x||"0",10)),C=!1,c&&r())}function w(){var c=document.getElementById("litb-read-frame");if(c){x=d.scrollY;var b=document.body;b.style.position="fixed";b.style.top="-"+x+"px";b.style.right="0";b.style.left="0";c.style.cssText="position:fixed; width:100%; height:100%; top:0px; left:0px; z-index:1000; display: block; border: 0 none;";C=!0}}function t(){var c=document.getElementById("litb-read-frame");f.litbData&&f.litbData.showNewDesktopLitb&&
c&&(z||!G()&&!C||(w(),c.contentWindow.postMessage(JSON.stringify({command:"updateLITB",search:d.location.search}),c.src)),z=!1);C||r()}function G(){var c=n(d.location.search);return c.asin&&c.format}function E(c){var b;if(b="string"===typeof c.data)try{JSON.parse(c.data),b=!0}catch(a){b=!1}b&&(c=JSON.parse(c.data),b=c.command,"closeLITB"===b?c.depth?(z=!0,d.history.go(-1*c.depth),y(!1)):y(!0):"updateLITB"===b&&c.search?(b=n(d.location.search),d.history.pushState({},document.title,d.location.origin+
d.location.pathname+J(c.search)+d.location.hash),b.asin!==c.search.asin&&d.dispatchEvent(new PopStateEvent("popstate"))):"readyLITB"===b?F=!0:"reloadLITB"===b&&d.location.reload())}function J(c){if(d.location.search){var b=n(d.location.search);b.asin=c.asin;b.revisionId=c.revisionId;b.format=c.format;b.depth=c.depth;c=v(b)}else c=v(c);return"?"+c}function v(c){var b="";Object.keys(c).forEach(function(a){0<b.length&&(b+="\x26");b+=a+"\x3d"+c[a]});return b}function n(c){var b={};0<c.length&&c.substr(1).split("\x26").forEach(function(a){a=
a.split("\x3d");2===a.length&&(b[a[0]]=a[1])});return b}c={};var z=!1,F=!1,C=!1,I=new N(g,e,f),B=0,D=0,x=0;c.initializeMetrics=function(){h("litbReadyMaxAttempts");h("litbReaderIframeSrcNotAvailable");h(sitbReaderCodePathUsedMetric);h(litbStickerClickedMetric)};c.initializeSticker=function(c){if(f&&f.litbData&&(f.litbData.hasLitb&&f.litbData.litbReftag||f.litbData.showNewDesktopLitb)){m.click(l.bind(this,!0,c));var b=document.getElementById("litb-read-frame");b&&b.dataset&&b.dataset.src?b.src=b.dataset.src:
k("litbReaderIframeSrcNotAvailable");f.litbData.showNewDesktopLitb&&b?(d.addEventListener("popstate",t,!1),d.addEventListener("message",E,!1),u(),b=n(d.location.search),b.asin&&b.format&&l(!1,c)):m.click(p.bind(this,!0,c))}};return c}}();p.when("A","jQuery","MobileLitbImageBlockATF").execute(function(g,e,c){var f=new aa(g,e,c);(function(){!d.smash&&c&&c.litbData&&c.litbData.hasLitb&&e("#sitb-sticker-container").click(function(c){f.triggerWeblab("LITB_EVO_PBOOK_MWEB_CLICK_ON_COVER_DPX_598270")})})()});
var aa=function(){return function(d,e,c){function f(){var d=document.createElement("a");d.href=c.litbData.litbReaderUrl;return d.hostname}return{triggerWeblab:function(c){e.ajax("https://"+f()+"/sample/trigger-weblab?weblab\x3d"+c,{method:"get",xhrFields:{withCredentials:!0},success:function(c){return c.treatment},error:function(c){return"Unable to trigger weblab due to "+c.responseText}})}}}}(),ba={"read.amazon.com":{marketplace:"US",region:"us-east-1",katalCloudWatchEndpointEmf:"https://b11v5ewz9l.execute-api.us-east-1.amazonaws.com/prod/v1/log"},
"read.amazon.co.jp":{marketplace:"JP",region:"us-west-2",katalCloudWatchEndpointEmf:"https://bs7kdk5kxb.execute-api.us-west-2.amazonaws.com/prod/v1/log"},"read.amazon.ca":{marketplace:"CA",region:"us-east-1",katalCloudWatchEndpointEmf:"https://b11v5ewz9l.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"ler.amazon.com.br":{marketplace:"BR",region:"us-east-1",katalCloudWatchEndpointEmf:"https://b11v5ewz9l.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"read.amazon.com.au":{marketplace:"AU",region:"us-west-2",
katalCloudWatchEndpointEmf:"https://bs7kdk5kxb.execute-api.us-west-2.amazonaws.com/prod/v1/log"},"leer.amazon.com.mx":{marketplace:"MX",region:"us-east-1",katalCloudWatchEndpointEmf:"https://b11v5ewz9l.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"read.amazon.co.uk":{marketplace:"GB",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"lesen.amazon.de":{marketplace:"DE",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},
"lire.amazon.fr":{marketplace:"FR",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"leggi.amazon.it":{marketplace:"IT",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"leer.amazon.es":{marketplace:"ES",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"lezen.amazon.nl":{marketplace:"NL",region:"eu-west-1",
katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read.amazon.in":{marketplace:"IN",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://hjszhb9uk3.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read-preprod.amazon.com":{marketplace:"US",region:"us-east-1",katalCloudWatchEndpointEmf:"https://wa9hufu4c9.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"read-pre-prod-jp.amazon.com":{marketplace:"JP",region:"us-west-2",katalCloudWatchEndpointEmf:"https://arufknsm9d.execute-api.us-west-2.amazonaws.com/prod/v1/log"},
"read-pre-prod-ca.amazon.com":{marketplace:"CA",region:"us-east-1",katalCloudWatchEndpointEmf:"https://wa9hufu4c9.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"read-pre-prod-br.amazon.com":{marketplace:"BR",region:"us-east-1",katalCloudWatchEndpointEmf:"https://wa9hufu4c9.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"read-pre-prod-au.amazon.com":{marketplace:"AU",region:"us-west-2",katalCloudWatchEndpointEmf:"https://arufknsm9d.execute-api.us-west-2.amazonaws.com/prod/v1/log"},"read-pre-prod-mx.amazon.com":{marketplace:"MX",
region:"us-east-1",katalCloudWatchEndpointEmf:"https://wa9hufu4c9.execute-api.us-east-1.amazonaws.com/prod/v1/log"},"read-pre-prod-uk.amazon.com":{marketplace:"GB",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read-pre-prod-de.amazon.com":{marketplace:"DE",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read-pre-prod-fr.amazon.com":{marketplace:"FR",region:"eu-west-1",
katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read-pre-prod-it.amazon.com":{marketplace:"IT",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read-pre-prod-es.amazon.com":{marketplace:"ES",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"lezen-nl-preprod.dub.xcorp.amazon.com":{marketplace:"NL",region:"eu-west-1",
katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"},"read-pre-prod-in.amazon.com":{marketplace:"IN",region:"eu-west-1",katalCloudWatchEndpointEmf:"https://fdoxuxsenl.execute-api.eu-west-1.amazonaws.com/prod/v1/log"}},N=function(){return function(d,e,c){function f(){var d=document.createElement("a"),e=document.getElementById("litb-read-frame");e?d.href=e.src:c&&c.litbData&&(d.href=c.litbData.litbReaderUrl);return d.hostname}return{incrementMetric:function(c){try{var d=
ba[f()];d&&e.ajax({url:d.katalCloudWatchEndpointEmf,type:"POST",data:JSON.stringify(V(c,d)),success:function(c){return c},error:function(c){return"Unable to log metric due to "+c}})}catch(l){return"Failed to emit metrics to cloudwatch due to "+l}}}}}(),W={COUNT:"Count",MILLISECONDS:"Milliseconds",NONE:"None"}});