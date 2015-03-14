
console.log("BACKGROUND ON");
chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                // We check we're on the right website
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {urlContains: 'forum.hardware.fr/forum2.php'},
                    })
                ],
                //Whe show the page action
                actions: [new chrome.declarativeContent.ShowPageAction()
                            //   new chrome.declarativeContent.RequestContentScript(null, {file: "content.js"})
                ]}
        ]);
    });
});



function displayNotification(notif, tabId)
{

    var opt =
            {
                type: "basic",
                iconUrl: "images/icon_80.png",
                title: notif.pseudo,
                message: notif.message,
                //buttons: [{
                //          title: "Répondre"}]
            };


    console.log(notif);
    chrome.notifications.clear("HFR", function()
    {
        chrome.notifications.create("HFR", opt, function() {
            chrome.notifications.onClicked.addListener(function()
            {
                chrome.tabs.update(tabId, {selected: true});

            })
        });
    });

}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request === "is_selected") {
        chrome.tabs.getSelected(null, function(tab) {

            if (tab.id === sender.tab.id) {
                sendResponse(true); //in focus (selected)
            } else {
                sendResponse(false);    //not in focus
            }
        });
    }
    if (request === "who") {
        sendResponse(sender.tab.id);
    }
    if (request.notification)
    {
        displayNotification(request.notification, sender.tab.id);
    }
    if (request.redirect)
    {
        if (request.options)
        {
            chrome.tabs.update(sender.tab.id, {url: request.redirect}, function()
            {
                console.log("redirecting");
                setTimeout(function()
                {
                    chrome.pageAction.setIcon({tabId: sender.tab.id, path: "images/icon_16_on.png"});
                    chrome.tabs.sendMessage(sender.tab.id, "start");
                    chrome.tabs.sendMessage(sender.tab.id, request.options);

                }, 2000);
            }
            );
        }
    }
    return true;
});