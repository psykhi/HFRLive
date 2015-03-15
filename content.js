/**
 * @file content.js
 * @author psykhi (alex@theboredengineers.com)
 * @date March 2015
 * @brief Content script
 * 
 * The script takes care of reloading the page and appending the new messages to
 * the page. Notifications are sent if the tab is not visible
 */

/**
 * Our refresh timer
 * @type type
 */
var timer;
/**
 * Are we visible? Updated each second
 * @type isSelected|Boolean
 */
var is_selected = false;
/**
 * Our tab id
 * @type Number
 */
var tabid = -1;
/**
 * String that holds the template href to add to the response button
 * @type type
 */
var href_string;
/**
 * Our tab options
 * @type opt|@exp;message@pro;options
 */
var options =
        {
            refresh_enabled: false,
            refresh_interval: 2000,
            notifications_enabled: false
        };

/***********************SCRIPT************************************/

// Are we new? Or just refreshed?
chrome.runtime.sendMessage({get_options: true, get_url: true}, function(response) {
    if (response.options)
    {
        onNewOptions(response.options);
    }
    else if (response.new )
    {
        /*We are a new tab*/
    }
    //We save the href template to respond to a message
    href_string = getElementByXpath
            ('//*[@id="mesdiscussions"]/table[3]/tbody/tr/td[2]/div[1]/div[1]/span/a/a').
            href;
    href_string = href_string.replace(/numrep=(.*?)&/, "numrep=trav&");

});

//We'll check if we're visible every second
setInterval(checkIfSelected, 1000);

chrome.extension.onMessage.addListener(
        function(message, sender, sendResponse)
        {
            if (message.options)
            {
                options = message.options;
            }
            if (message.start)
            {
                startAutoRefresh();
                sendResponse(options);
            }
            else if (message.stop)
            {
                stopAutoRefresh();
                sendResponse(options);
            }
            else if (message.get_options)
            {
                sendResponse(options);
            }
            else if (message.disable_notifications)
            {
                notificationsEnable(false);
            }
            else if (message.enable_notifications)
            {
                notificationsEnable(true);
            }
        }
);
/*************************END OF SCRIPT****************************/

/**
 * @brief Finds an element in the document from its xPATH
 * @param {type} path
 * @returns 
 */
function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

/**
 * @brief Callback when new options are available
 * @param {type} opt
 * @returns {undefined}
 */
function onNewOptions(opt)
{
    options = opt;

    if (options.refresh_enabled)
    {
        startAutoRefresh();
    }
    notificationsEnable(options.notifications_enabled);
}

/**
 * @brief Asks the background page id the tab is visible
 * @returns nothing /ASYNC
 */
function checkIfSelected()
{
    chrome.runtime.sendMessage({is_selected: true}, function(isSelected) {
        is_selected = isSelected;
    });
}

/**
 * @brief Sends a notification for the last message
 * @param {type} content 
 * @param {type} avatar
 * @param {type} pseudo
 * @param {type} url
 * @returns {undefined}
 */
function sendNotification(content, avatar, pseudo, url)
{
    var notif =
            {
                message: content,
                avatarUrl: avatar,
                pseudo: pseudo,
                messageUrl: url
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
 * @brief Finds the URL to a given message
 * @param {type} message
 * @returns {@exp;href_string@call;replace}
 */
function getMessageLink(message)
{
    var message_value = message.find('a[href^="#t"]').get(0).hash.substring(2);
    return href_string.replace("trav", message_value);
}
/**
 * @brief Fixes the missing href link for the reply button
 * @param {type} message
 * @returns {undefined}
 */
function appendMissingQuoteHref(message)
{
    var to_modify = $(message).find('img[src="http://forum-images.hardware.fr/themes_static/images_forum/1/quote.gif"]').get(0);
    $(to_modify).wrap('<a href ="' + getMessageLink(message) + '"></a>');
}
/**
 * @brief Refreshes the page
 * @returns {undefined}
 */
function refresh()
{
    //console.log("refreshing");
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
                appendMissingQuoteHref($(message));
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
        var messageText = mess.find(".messCase2").children("div:last").get(0).innerText;
        var messageUrl = getMessageLink(mess);
        var avatarUrl = mess.find(".messCase1").children("div:last").find("img").get(0).src;
        var pseudo = mess.find(".messCase1").find(".s2").get(0).innerText;

        if (options.notifications_enabled)
            sendNotification(messageText, avatarUrl, pseudo, messageUrl);
    }
}

/**
 * Starts the refreshing loop
 * @returns {undefined}
 */
function startAutoRefresh()
{
    timer = setInterval(refresh, options.refresh_interval);
    setOption({refresh_enabled: true});
}

/**
 * @brief Stops the refreshing loop
 * @returns {undefined}
 */
function stopAutoRefresh()
{
    clearInterval(timer);
    setOption({refresh_enabled: false});
}

/**
 * @brief Enables notifications
 * @param {type} state
 * @returns {undefined}
 */
function notificationsEnable(state)
{
    setOption({notifications_enabled: state});
}

/**
 * Set an option and publish the new values
 * @param {type} opt
 * @returns {undefined}
 */
function setOption(opt)
{
    if (typeof opt.refresh_enabled !== 'undefined')
    {
        options.refresh_enabled = opt.refresh_enabled;
    }
    if (typeof opt.notifications_enabled !== 'undefined')
    {
        options.notifications_enabled = opt.notifications_enabled;
    }
    chrome.runtime.sendMessage({save_options: options});
}




        