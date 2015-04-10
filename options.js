
function updateTextInput(val) {
    document.getElementById('delay_refresh_text').value = val / 1000;
}





function prepare_page()
{
    set_listeners();
    restore_options();
}

function set_listeners()
{
    document.getElementById('delay_refresh').addEventListener('input', function()
    {
        var newVal = document.getElementById('delay_refresh').value;
        document.getElementById('delay_refresh_text').value = newVal + "s";
    }, false);
    document.getElementById('scroll_duration').addEventListener('input', function()
    {
        var newVal = document.getElementById('scroll_duration').value;
        document.getElementById('scroll_duration_text').value = newVal + "ms";
    }, false);
}

function onNewScrollDuration()
{
    var newVal = document.getElementById('scroll_duration').value;
    var newOpt =
            {
                new_options: {
                    new_scroll_duration: newVal
                }
            };
    chrome.tabs.query({url: 'http://forum.hardware.fr/*'}, function(tabs) {
        console.log(tabs);
        for (id = 0; id < tabs.length; id++)
        {
            chrome.tabs.sendMessage(tabs[id].id, newOpt);
        }
    });
}

function onNewRefreshDelay()
{
    var newVal = document.getElementById('delay_refresh').value *1000;
    var newOpt =
            {
                new_options: {
                    new_refresh_delay: newVal
                }
            };
    chrome.tabs.query({url: 'http://forum.hardware.fr/*'}, function(tabs) {
        console.log(tabs);
        for (id = 0; id < tabs.length; id++)
        {
            chrome.tabs.sendMessage(tabs[id].id, newOpt);
        }
    });
}

function restore_options() {
    console.log("RESTORE");
    chrome.storage.sync.get({
        delay_refresh: 2000,
        scroll_duration: 1000
    }, function(items) {
        document.getElementById('scroll_duration').value = items.scroll_duration;
        document.getElementById('delay_refresh').value = items.delay_refresh / 1000;
        document.getElementById('scroll_duration_text').value = items.scroll_duration + "ms";
        document.getElementById('delay_refresh_text').value = items.delay_refresh / 1000 + "s";
    });
}

function save_options() {
    var delay = document.getElementById('delay_refresh').value * 1000;
    var scroll = document.getElementById('scroll_duration').value;

    console.log("SAVE");

    chrome.storage.sync.set({
        delay_refresh: delay,
        scroll_duration: scroll
    }, function() {
        _gaq.push(['_trackEvent', 'delay_refresh', delay]);
        _gaq.push(['_trackEvent', 'scroll_duration', scroll]);
        onNewScrollDuration();
        onNewRefreshDelay();
    });
}

/*********************************SCRIPT***************************************/
//Google analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-60766637-1']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();


document.addEventListener('DOMContentLoaded', prepare_page);
document.getElementById('save').addEventListener('click',
        save_options);