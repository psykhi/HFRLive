/**
 * @file background.js
 * @author psykhi (alex@theboredengineers.com)
 * @date March 2015
 * @brief Background script
 * 
 * Background scripts that show the page action icon when needed and also
 * keeps track of the used tabs states.
 * 
 */



var Context =
        {
            /**
             * Our array where we keep the state of reloading tabs
             * @type Array
             */
            tabsState: [],
            notifications: [],
            notif_op: false,
            options: {
                refresh_interval: 4000,
                scroll_duration: 1000
            }
        };
/***********************************SCRIPT*************************************/
//Google analytics
var manifest = chrome.runtime.getManifest();
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-60766637-1']);
_gaq.push(['_trackPageview']);
_gaq.push(['_trackEvent', 'version', manifest.version]);
(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();


// We show the page action icon
chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([
            {
// We check we're on the right website
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {urlMatches: 'forum\.hardware\.fr/forum2.php.|forum\.hardware\.fr/hfr/.'}
                    })
                ],
                //Whe show the page action
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });
});
// We get ready to receive requests
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log(request);
    if (request.is_selected) {
        chrome.tabs.getSelected(null, function(tab) {

            if (tab.id === sender.tab.id) {
                sendResponse(true); //in focus (selected)
            } else {
                sendResponse(false); //not in focus
            }
        });
    }
    if (request.notification)
    {
        prepareNotification(request.notification, sender.tab.id, sender.tab.windowId);
    }
    if (request.get_context)
    {
        prepareContextForTab(sender.tab.id, sendResponse);
    }
// A tabs wants to change page
    if (request.redirect)
    {
        if (request.save_context)
        {
// We save its options
            Context.tabsState[sender.tab.id] = request.context;
            chrome.tabs.update(sender.tab.id, {url: request.redirect});
        }
    }
    if (request.save_context)
    {
        Context.tabsState[sender.tab.id] = request.save_context;
        if (!Context.tabsState[sender.tab.id].state.refresh_enabled)
        {
            chrome.pageAction.setIcon({tabId: sender.tab.id,
                path: "images/icon_16.png"});
        }
    }
    return true;
});
/*****************************END OF SCRIPT************************************/

function prepareContextForTab(id, sendResponse)
{

    loadOptionsFromStorage(function() {
//A tab has been reloaded and ias asking for its state(new or refreshed)
        if (Context.tabsState[id])
        {
            Context.tabsState[id].options = Context.options;
// The tab has been refreshed, we send it its state
            sendResponse({context: Context.tabsState[id]});
            if (Context.tabsState[id].state.refresh_enabled)
            {
                chrome.pageAction.setIcon({tabId: id,
                    path: "images/icon_16_on.png"});
            }

// We remove the element from our tabsState array
            var idx = Context.tabsState.indexOf(id);
            if (idx > -1)
            {
                Context.tabsState.splice(idx, 1);
            }
        }
        else
        {
//It's a new tab
            sendResponse({context: new ContentContext(Context.options)});
        }
    });
}

function ContentContext(options)
{
    /**
     * We keep this variable so we know a previous refresh is not running
     * @type Boolean|Boolean|Boolean
     */
    this.ready_to_refresh = true;
    /**
     * Our tab id
     * @type Number
     */
    this.tab_id = -1;
    /**
     * String that holds the template href to add to the response button
     * @type type
     */
    this.href_string = "";
    /**
     * Our tab options
     * @type opt|@exp;message@pro;options
     */
    this.options = options ||
            {
                refresh_interval: 4000,
                scroll_duration: 1000
            };
    this.state =
            {
                refresh_enabled: false,
                notifications_enabled: false
            };
    this.current_page = 0;
}
;


function loadOptionsFromStorage(callback)
{
    chrome.storage.sync.get({
        delay_refresh: 4000,
        scroll_duration: 1000
    }, function(items) {
        Context.options.refresh_interval = items.delay_refresh;
        Context.options.scroll_duration = items.scroll_duration;
        callback();
    });

}

function convertImgToBase64(url, callback, outputFormat) {
    var canvas_resized = document.createElement('CANVAS');
    var img = new Image;
    img.crossOrigin = 'Anonymous';
    img.onload = function() {

        canvas_resized.height = 80;
        canvas_resized.width = 80;
        if (img.height > img.width)
        {
            canvas_resized.getContext('2d').drawImage(img, 80 * (1 - (img.width / img.height)) / 2, 0, (img.width / img.height) * 80, 80);
        }
        else
        {
            canvas_resized.getContext('2d').drawImage(img, 0, 80 * (1 - (img.height / img.width)) / 2, 80, (img.height / img.width) * 80);

        }
        var dataURL = canvas_resized.toDataURL(outputFormat || 'image/jpg');
        callback.call(this, dataURL);
        // Clean up
        canvas_resized = null;
    };
    img.src = url;
}

function displayNotification(notif, tabId, windowId, img)
{
    //console.log(img);
    //We prepare the notification
    var opt =
            {
                type: "basic",
                //iconUrl: "images/icon_80.png",
                iconUrl: img,
                title: notif.pseudo,
                //We remove the potential signature
                message: notif.message.split("---------------")[0],
                buttons: [{
                        title: "Répondre"}, {title: "Arrêter le live"}],
                isClickable: true,
                contextMessage: notif.quote
            };
//We display it (we remove the previous if there was any
    chrome.notifications.create("", opt, function(id) {
        if (!Context.notifications[id])
        {

            Context.notifications[id] = new Object();
            Context.notifications[id].tab_id = 0;
            Context.notifications[id].window_id = 0;
            Context.notifications[id].href_url = "";
        }
        Context.notifications[id].tab_id = tabId;
        Context.notifications[id].window_id = windowId;
        Context.notifications[id].href_url = notif.messageUrl;
        if (!Context.notif_op)
        {
            Context.notif_op = true;
            chrome.notifications.onClicked.addListener(function(notif_id)
            {
                chrome.windows.update(Context.notifications[notif_id].window_id, {focused: true});
                chrome.tabs.update(Context.notifications[notif_id].tab_id, {selected: true});
            });
            // We link the "Reply" button to the message
            chrome.notifications.onButtonClicked.addListener(function(notif_id, index)
            {
                switch (index)
                {
                    case 0://Open reply window
                        chrome.tabs.create({url: Context.notifications[notif_id].href_url, active: true});
                        break;
                    case 1://Stops the live refresh
                        chrome.tabs.sendMessage(Context.notifications[notif_id].tab_id, {stop: true});
                        chrome.pageAction.setIcon({tabId: Context.notifications[notif_id].tab_id,
                            path: "images/icon_16.png"});
                        break;
                    default:
                        break;
                }
            });
        }
    });
}
/**
 * @brief Displays a notification
 * @param {type} notif
 * @param {type} tabId
 * @param {type} windowId window ID
 * @returns {undefined}
 */
function prepareNotification(notif, tabId, windowId)
{
    if (notif.avatarUrl !== "")
    {
        convertImgToBase64(notif.avatarUrl, function(img) {
            displayNotification(notif, tabId, windowId, img);
        });
    }
    else
    {
        displayNotification(notif, tabId, windowId, "images/icon_80.png");
    }

}
