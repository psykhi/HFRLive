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


/**
 * Our array where we keep the state of reloading tabs
 * @type Array
 */
var tabsState = [];
/**
 * We keep track of the listener registration
 * @type Boolean|Boolean
 */
var notif_op = false;
/**
 * Notificaiton callback url
 * @type @exp;notif@pro;messageUrl
 */
var href_url;
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
    if (request.is_selected) {
        chrome.tabs.getSelected(null, function(tab) {

            if (tab.id === sender.tab.id) {
                sendResponse(true); //in focus (selected)
            } else {
                sendResponse(false);    //not in focus
            }
        });
    }
    if (request.notification)
    {
        displayNotification(request.notification, sender.tab.id, sender.tab.windowId);
    }
    if (request.get_options)
    {
        //A tab has been reloaded and ias asking for its state(new or refreshed)
        if (tabsState[sender.tab.id])
        {
            // The tab has been refreshed, we send it its state
            sendResponse({options: tabsState[sender.tab.id]});
            if (tabsState[sender.tab.id].refresh_enabled)
            {
                chrome.pageAction.setIcon({tabId: sender.tab.id,
                    path: "images/icon_16_on.png"});
            }

            // We remove the element from our tabsState array
            var idx = tabsState.indexOf(sender.tab.id);
            if (idx > -1)
            {
                tabsState.splice(idx, 1);
            }
        }
        else
        {
            //It's a new tab
            sendResponse({new : true});
        }
    }
    // A tabs wants to change page
    if (request.redirect)
    {
        if (request.options)
        {
            // We save its options
            tabsState[sender.tab.id] = request.options;
            chrome.tabs.update(sender.tab.id, {url: request.redirect});
        }
    }
    if (request.save_options)
    {
        tabsState[sender.tab.id] = request.save_options;
    }
    return true;
});
/*****************************END OF SCRIPT************************************/

/**
 * @brief Displays a notification
 * @param {type} notif
 * @param {type} tabId
 * @returns {undefined}
 */
function displayNotification(notif, tabId, windowId)
{
    //We prepare the notification
    var opt =
            {
                type: "basic",
                iconUrl: "images/icon_80.png",
                title: notif.pseudo,
                //We remove the potential signature
                message: notif.message.split("---------------")[0],
                buttons: [{
                        title: "Répondre"}, {title: "Stop live"}],
                isClickable: true,
                contextMessage: notif.quote
            };

//We display it (we remove the previous if there was any
    chrome.notifications.create("", opt, function() {

        href_url = notif.messageUrl;
        if (!notif_op)
        {
            notif_op = true;
            chrome.notifications.onClicked.addListener(function()
            {
                chrome.windows.update(windowId, {focused: true});
                chrome.tabs.update(tabId, {selected: true});
            });
            // We link the "Reply" button to the message
            chrome.notifications.onButtonClicked.addListener(function(id, index)
            {
                switch (id)
                {
                    case 0://Open reply window
                        chrome.tabs.create({url: href_url, active: true});
                        break;
                    case 1://Stops the live refresh
                        chrome.tabs.sendMessage(tabId, {stop: true});
                        chrome.pageAction.setIcon({tabId: tabId,
                            path: "images/icon_16.png"});
                        break;
                    default:
                        break;
                }
            });
        }
    });
}
