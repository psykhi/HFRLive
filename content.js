

var timer;
var is_selected = false;
var tabid = -1;
console.log("Content loaded");


var options =
        {
            refresh_enabled: false,
            refresh_interval: 2000,
            notifications_enabled: false
        };



chrome.extension.onMessage.addListener(
        function(message, sender, sendResponse)
        {
            console.log(message);
            if (message.options)
            {
                options = message.options;
                console.log("options set");
                console.log(options.notifications_enabled);
            }
            if (message === "start")
            {
                console.log("got start message");
                startAutoRefresh();
                sendResponse(options.refresh_enabled);
            }
            else if (message === "stop")
            {
                console.log("got stop message");
                stopAutoRefresh();
                sendResponse(options.refresh_enabled);
            }
            else if (message === "get_state")
            {
                console.log(options.refresh_enabled);
                sendResponse(options.refresh_enabled);
            }
            else if (message === "disable_notifications")
            {
                notificationsEnable(false);
            }
            else if (message === "enable_notifications")
            {
                notificationsEnable(true);
            }
        }
);

setInterval(check_if_selected, 1000);
/**
 * @brief Asks the background page id the tab is visible
 * @returns nothing /ASYNC
 */
function check_if_selected()
{
    chrome.runtime.sendMessage("is_selected", function(isSelected) {
        is_selected = isSelected;
    });
}

/**
 * @brief Sends a notification for the last message
 * @param {type} content 
 * @param {type} avatar
 * @param {type} pseudo
 * @returns {undefined}
 */
function sendNotification(content, avatar, pseudo)
{
    var notif =
            {
                message: content,
                avatarUrl: avatar,
                pseudo: pseudo
            };

    var request =
            {
                notification: notif
            };
    if (!avatar)
        notif.avatarUrl = "icon.png";
    chrome.runtime.sendMessage(request);

}
/**
 * 
 * @returns current page ex "33256"
 */
function getCurrentPageIndex()
{
    return $(".cBackHeader").find("b:last").last().get(0).innerText;
}
/**
 * @brief Gets the latest page index
 * @param {type} html
 * @returns last page ex :"33256"
 */
function getLatestPageIndex(html)
{
    return $(html).find(".cBackHeader .left ").children().last().get(0).innerText;
}
/**
 * @brief Goes to the next forum page
 * @param {type} html
 * @returns {undefined}
 */
function goToNextPage(html)
{
    var url = $(html).find(".pagepresuiv a").get(0).href;
    //window.location.href = $(html).find(".pagepresuiv a").get(0).href;
    var request =
            {
                redirect: url,
                options: options
            };
    chrome.runtime.sendMessage(request);



}
/**
 * @brief Refreshes the page
 * @returns {undefined}
 */
function refresh()
{
    console.log("refreshing");
//We look where the last message is
    var page_len = $(".messagetable").length;
    $.get(document.URL, function(data)
    {
        // New page HTML
        var html = $.parseHTML(data);
        // Message count of current page
        var mess_count = $(html).find(".messagetable").length;

        var current_page = getCurrentPageIndex();
        var last_page = getLatestPageIndex(html);
        if (current_page !== last_page)
        {
            console.log("page " + current_page + " vs new " + last_page);
            goToNextPage(html);
            return;
        }
        if (mess_count !== page_len)
        {
            var target = $(".messagetable").last();
            var message;

            for (i = page_len; i < mess_count; i++)
            {
                //We append the new message
                message = $(html).find(".messagetable").get(i);
                $(".messagetable").last().after(message).fadeIn(1000);
            }

            //We notify the user
            buildNotification($(".messagetable").last());
            //We scroll to the last read message
            $('html, body').animate({
                scrollTop: target.offset().top
            }, 2000);
        }
    });


}
/**
 * @brief Builds and send a notification if the notifications are active
 * @param {type} mess
 * @returns {undefined}
 */
function buildNotification(mess)
{
    if (!is_selected)
    {
        console.log("building notif");
        var messageText = mess.find(".messCase2").children("div:last").get(0).innerText;
        //var messageUrl = mess.find(".messCase1").children("div:first").find("img").get(0).src;
        var avatarUrl = mess.find(".messCase1").children("div:last").find("img").get(0).src;
        var pseudo = mess.find(".messCase1").find(".s2").get(0).innerText;

        if (options.notifications_enabled)
            sendNotification(messageText, avatarUrl, pseudo);
    }
}

/**
 * @brief Main refresh loop
 * @returns {undefined}
 */
function loop()
{
    if (options.refresh_enabled) {
        refresh();
    }
}

/**
 * Starts the refreshing loop
 * @returns {undefined}
 */
function startAutoRefresh()
{
    timer = setInterval(loop, options.refresh_interval);
    options.refresh_enabled = true;
}

/**
 * @brief Stops the refreshing loop
 * @returns {undefined}
 */
function stopAutoRefresh()
{
    clearInterval(timer);
    options.refresh_enabled = false;
}

/**
 * @brief Enables notifications
 * @param {type} state
 * @returns {undefined}
 */
function notificationsEnable(state)
{
    options.notifications_enabled = state;
    console.log("notif " + state);
}






        