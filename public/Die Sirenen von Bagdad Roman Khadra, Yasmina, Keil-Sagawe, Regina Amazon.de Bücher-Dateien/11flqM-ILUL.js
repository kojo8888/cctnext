(function(e){var f=window.AmazonUIPageJS||window.P,g=f._namespace||f.attributeErrors,c=g?g("DetailPageBookDescriptionAssets",""):f;c.guardFatal?c.guardFatal(e)(c,window):c.execute(function(){e(c,window)})})(function(e,f,g){e.when("A","jQuery","atf").execute(function(c,a,f){if(a("#bookDescription_feature_div").length){var b=a("#outer_postBodyPS").height();a("#postBodyPS").height()>b+30?(a("#outer_postBodyPS").show(),a("#outer_postBodyPS").css("height",b),a("#psPlaceHolder").show(),a("#expandPS").show(),
a("#collapsePS").hide()):(a("#outer_postBodyPS").css("height","auto"),a("#psPlaceHolder").hide());a("#bookDescription_feature_div .a-link-expander").click(function(){a("#bdSeeAllPrompt").is(":hidden")?(a("#outer_postBodyPS").animate({height:b},500),a("#bdSeeAllPrompt").show(),a("#bdSeeLessPrompt").hide()):(a("#outer_postBodyPS").animate({height:a("#postBodyPS").height()},500),a("#bdSeeAllPrompt").hide(),a("#bdSeeLessPrompt").show());a("#bdExpanderIcon").toggleClass("bookDescription-read-more-icon-rotate");
return!1})}});e.when("A","jQuery","DynamicIframe","bookDescriptionIframe").execute(function(c,a,e,b){if(a("#bookDescription_feature_div").length){var h=function(){var d=a("#"+n).contentDocument;if(b.staticHeight&&d&&d.defaultView)var c=parseInt(b.numLines,10),e=d.find("#iframeContent"),d=d.defaultView.getComputedStyle(e,null).getPropertyValue("line-height"),d=parseFloat(d),d=Math.round(d*c);else c=document.getElementById(b.featureDiv).offsetTop,d=document.getElementById(b.imageBlockDiv).offsetTop,
e=document.getElementById(b.imageBlockDiv).offsetHeight,d=d+e-c-30,d<g&&(d=g);c=document.getElementById(b.postBodyId).offsetHeight;c>d+30?a("#"+b.seeLessPromptId).hasClass("a-hidden")?(a("#"+b.outerBodyId).height(d),a("#"+b.placeHolderId).removeClass("a-hidden"),a("#"+b.seeAllPromptId).removeClass("a-hidden")):a("#"+b.outerBodyId).height(c):(a("#"+b.outerBodyId).height(c),a("#"+b.placeHolderId).addClass("a-hidden"),a("#"+b.seeAllPromptId).removeClass("a-hidden"),a("#"+b.seeLessPromptId).addClass("a-hidden"),
a("#"+b.expanderIconId).removeClass("bookDescription-read-more-icon-rotate"));d=a("#"+b.outerBodyId).height();0===m&&(m=d);d=m;c>d+30&&a("#"+b.seeLessPromptId).is(":hidden")?(a("#"+b.outerBodyId).show(),a("#"+b.outerBodyId).css("height",d),a("#"+b.placeHolderId).show(),a("#expandPS").removeClass("a-hidden"),a("#collapsePS").addClass("a-hidden")):a("#"+b.outerBodyId).css("height","auto")};"use strict";var k=null;c=b.encodedDescription;var m=0,g=112,l={},n=b.iFrameId;l.iframeId=n;l.iframeWrapperId=
"bookDesc_iframe_wrapper";l.overriddenCSSId="bookDesc_override_CSS";l.encodedIframeContent=c;l.initialResizeCallback=h;k=new e(l);k.createIframe();"undefined"!==typeof k&&k instanceof e&&(a(f).resize(function(){k.resizeIframe(h)}),a(f).bind("imageResize",function(){k.resizeIframe(h)}));a("#"+b.featureDiv+" .a-link-expander").click(function(){var d="#"+b.outerBodyId,c="#"+b.seeAllPromptId,e="#"+b.seeLessPromptId,f="#"+b.expanderIconId,h="#"+b.postBodyId;a(c).hasClass("a-hidden")?(h=m,a(d).animate({height:h},
500),a(c).removeClass("a-hidden"),a(e).addClass("a-hidden"),a(f).removeClass("bookDescription-read-more-icon-rotate")):(a(d).animate({height:a(h).height()},500),a(c).addClass("a-hidden"),a(e).removeClass("a-hidden"),a(f).addClass("bookDescription-read-more-icon-rotate"));return!1})}});e.when("A","jQuery","ready").execute("dpProductInfoTabs",function(c){c.on("a:tabs:product_info_tabs:select",function(){e.when("a-expander").execute(function(a){a.initializeExpanders()})});for(var a=document.getElementsByClassName("productInfoTabExpander"),
g=0;g<a.length;g++)c.on("a:expander:"+a[g].getAttribute("data-a-expander-name")+":toggle:collapse",function(a){a=document.getElementsByClassName("productInfoTab");var c=a[0].getBoundingClientRect();0<=c.top&&0<=c.left&&c.bottom<=(f.innerHeight||document.documentElement.clientHeight)&&c.right<=(f.innerWidth||document.documentElement.clientWidth)||a[0].scrollIntoView()})})});