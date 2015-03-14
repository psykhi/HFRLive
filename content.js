

var timer;
var is_selected = false;
var tabid = -1;
console.log("Content loaded");


chrome.runtime.sendMessage("who", function(resp)
{
    console.log(resp);
});

var options =
        {
            refresh_enabled: false,
            refresh_interval: 2000,
            notifications_enabled: false
        };



chrome.extension.onMessage.addListener(
        function(message, sender, sendResponse)
        {

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
                notifications_set_state(false);
            }
            else if (message === "enable_notifications")
            {
                notifications_set_state(true);
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


function sendNotification(html, avatar, pseudo)
{
    var notif =
            {
                message: html,
                avatarUrl: avatar,
                pseudo: pseudo
            };

    var request =
            {
                notification: notif
            }
    if (!avatar)
        notif.avatarUrl = "icon.png";
    chrome.runtime.sendMessage(request);

}
function get_current_page()
{
    return $(".cBackHeader").find("b:last").last().get(0).innerText;
}

function get_last_page(html)
{
    return $(html).find(".cBackHeader .left ").children().last().get(0).innerText;
}

function goToNextPage(html)
{
    var url = $(html).find(".pagepresuiv a").get(0).href;
    //window.location.href = $(html).find(".pagepresuiv a").get(0).href;
    var request =
            {
                redirect: url
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
        
        var current_page = get_current_page();
        var last_page = get_last_page(html);
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
                $(".messagetable").last().after(message).show("slide", {direction: "left"}, 1000);
            }
            
            //We notify the user
            buildNotification($(html).find(".messagetable").last());
            //We scroll to the last read message
            $('html, body').animate({
                scrollTop: target.offset().top
            }, 2000);
        }
    });


}
function buildNotification(mess)
{
    var messageText = mess.find(".messCase2").children("div:last").get(0).innerText;
    var avatarUrl = mess.find(".messCase1").children("div:last").find("img").get(0).src;
    var pseudo = mess.find(".messCase1").find(".s2").get(0).innerText;

    if (!is_selected)
    {
        if (options.notifications_enabled)
            sendNotification(messageText, avatarUrl, pseudo);
    }
}

function loop()
{
    if (options.refresh_enabled) {
        refresh();
    }
}


function startAutoRefresh()
{
    timer = setInterval(loop, options.refresh_interval);
    options.refresh_enabled = true;
}

function stopAutoRefresh()
{
    clearInterval(timer);
    options.refresh_enabled = false;
}

function notifications_set_state(state)
{
    options.notifications_enabled = state;
    console.log("notif " + state);
}






        