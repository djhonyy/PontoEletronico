/***********************************************************/
/*                    tinyTips Plugin                      */
/*                      Version: 1.0                       */
/*                      Mike Merritt                       */
/*                 Updated: Feb 4th, 2010                  */
/***********************************************************/
(function(a){a.fn.tinyTips=function(b){var c='<div class="tinyTip"><div class="content"></div><div class="bottom">&nbsp;</div></div>';var d=300;var e;var f;a(this).hover(function(){a("body").append(c);e=a("div.tinyTip");e.hide();if(b==="title"){var g=a(this).attr("title")}else{if(b!=="title"){var g=b}}a(".tinyTip .content").html(g);f=a(this).attr("title");a(this).attr("title","");var j=e.height()+17;var h=(((e.width()-10)/2))-(a(this).width()/2);var k=a(this).offset();var i=k;i.top=k.top-j;i.left=k.left-h;e.css("position","absolute").css("z-index","1000");e.css(i).fadeIn(d)},function(){a(this).attr("title",f);a("div.tinyTip").fadeOut(d,function(){a(this).remove()})})}})(jQuery);