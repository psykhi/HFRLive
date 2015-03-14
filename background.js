
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



function displayNotification(notif)
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
    chrome.notifications.update("HFR", opt, function(updated) {
        if (!updated)
        {
            chrome.notifications.create("HFR", opt, function() {

            });
        }

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
        displayNotification(request.notification);
    }
    if (request.redirect)
        chrome.tabs.update(sender.tab.id, {url: request.redirect}, function() {

            console.log("redirecting");
            setTimeout(function()
            {
                chrome.tabs.sendMessage(sender.tab.id, "start");
            }, 2000);



        });

    return true;
});