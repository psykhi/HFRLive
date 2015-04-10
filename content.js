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
            notifications_enabled: false,
            scroll_duration: 1000
        };
/**
 * We keep this variable so we know a previous refresh is not running
 * @type Boolean|Boolean|Boolean
 */
var ready_to_refresh = true;


/***********************SCRIPT************************************/

//We save the href template to respond to a message
href_string = getElementByXpath
        ('//*[@id="mesdiscussions"]/table[3]/tbody/tr/td[2]/div[1]/div[1]/span/a/a').
        href;
href_string = href_string.replace(/numrep=(.*?)&/, "numrep=trav&");

// Are we new? Or just refreshed?
chrome.runtime.sendMessage({get_options: true, get_url: true}, function(response) {
    if (response.options)
    {
        onNewOptions(response.options);
        if (options.refresh_enabled)
            buildNotification($(".messagetable").last());
    }
    else if (response.new )
    {
        /*We are a new tab*/



    }


});

loadOptionsFromStorage();
//We'll check if we're visible every second
setInterval(checkIfSelected, 1000);


chrome.runtime.onMessage.addListener(
        function(message, sender, sendResponse)
        {
            console.log(message);
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
            else if (message.new_options)
            {
                registerNewOptions(message.new_options);
            }
        }
);
/*************************END OF SCRIPT****************************/

function loadOptionsFromStorage()
{
    chrome.storage.sync.get({
        delay_refresh: '2000',
        scroll_duration: 1000
    }, function(items) {
        options.refresh_interval = items.delay_refresh;
        options.scroll_duration = items.scroll_duration;
    });

}

function registerNewOptions(opt)
{
    console.log(opt);
    if (opt.new_refresh_delay)
    {
        changeRefreshInterval(opt.new_refresh_delay);
    }
    if (opt.new_scroll_duration)
    {
        options.scroll_duration = opt.new_scroll_duration;
    }
}

function changeRefreshInterval(val)
{
    options.refresh_interval = val;

}
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
 * @param quote_author 
 * @returns {undefined}
 */
function sendNotification(content, avatar, pseudo, url, quote_author)
{
    var quote_text = "";
    if (quote_author !== "")
        quote_text = "En réponse à " + quote_author;
    var notif =
            {
                message: content,
                avatarUrl: avatar,
                pseudo: pseudo,
                messageUrl: url,
                quote: quote_text
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
    var message_value = getMessageId(message);
    return href_string.replace("trav", message_value);
}

function getMessageId(message)
{
    return message.find('a[href^="#t"]').get(0).hash.substring(2);
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
// Should we refresh?
    if (ready_to_refresh && options.refresh_enabled) {
        console.log("refreshing");
        ready_to_refresh = false;
        var page_len = $(".messagetable").length;
        $.get(document.URL, function(data)
        {
            try {
                // New page HTML
                var html = $.parseHTML(data);
                // Message count of current page
                var mess_table = $(html).find(".messagetable");
                var mess_count = mess_table.length;
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
                        message = mess_table.get(i);
                        appendMissingQuoteHref($(message));
                        $(".messagetable").last().after(message).fadeIn(options.scroll_duration);

                    }
                    // We change the quick response link
                    updateQuickResponse($(".messagetable").last());
                    //We notify the user
                    buildNotification($(".messagetable").last());
                    $('html, body').on("scroll mousedown DOMMouseScroll mousewheel keyup", function() {
                        $('html, body').stop();
                    });
                    if (options.scroll_duration === 0)
                    {
                        window.moveTo(window.screenX, target.offset().top);
                    } else
                    {
                        //We scroll to the last read message
                        $('html, body').animate({
                            scrollTop: target.offset().top
                        }, options.scroll_duration, function() {
                            $('html, body').off("scroll mousedown DOMMouseScroll mousewheel keyup");
                        });
                    }
                }
                ready_to_refresh = true;
            }
            catch (err)
            {
                console.log(err.stack);
                ready_to_refresh = true;
            }
        });

    }
    else
    {

        //console.log("not ready to refresh.");
    }
    if (options.refresh_enabled)
        setTimeout(refresh, options.refresh_interval);
}
/**
 * Updates the quick response POST numrep attribute 
 * @param {type} message
 * @returns {undefined} */
function updateQuickResponse(message)
{
    var id = getMessageId(message);
    var html = getElementByXpath('//*[@id="md_fast_search"]/input[4]');
    html.value = id;
}

/**
 * @brief Gets the quote author or returns "" if there is no quote 
 * @param {type} message
 * @returns {String} */
function messageHasAQuote(message)
{
    try {
        var quotes = message.find(".citation");
        if (typeof quotes !== 'undefined')
        {
            console.log(quotes.get(0).innerText.split(" a écrit"));
            return quotes.get(0).innerText.split(" a écrit")[0];
        }
        else
            return "";
    }
    catch (err)
    {
        return "";
    }
}

/**
 * @brief Formats the message in a simple plain text message (removing the quotes)
 * @param {type} message
 * @returns {}
 */
function formatNotificationText(message)
{
    var message_copy = message.clone();
    message_copy.find(".citation").remove();
    return message_copy.find(".messCase2").children("div:last").get(0).innerText.replace(/^\s*\n/gm, "");
}

/**
 * @brief Builds and send a notification if the notifications are active
 * @param {type} mess
 * @returns {undefined}
 */
function buildNotification(mess)
{
    if ((!is_selected) && options.notifications_enabled)
    {
        try {
            var avatarUrl;
            var respondsTo = messageHasAQuote(mess);
            var messageText = formatNotificationText(mess);
            var messageUrl = getMessageLink(mess);
            var pseudo = mess.find(".messCase1").find(".s2").get(0).innerText;
            try {
                avatarUrl = mess.find(".messCase1").children("div:last").find("img").get(0).src;
            }
            catch (err)
            {
                avatarUrl = "";
            }

            sendNotification(messageText, avatarUrl, pseudo, messageUrl, respondsTo);
        }
        catch (err)
        {
            console.log(err.stack);
        }
    }
}

/**
 * Starts the refreshing loop
 * @returns {undefined}
 */
function startAutoRefresh()
{
    timer = setTimeout(refresh, options.refresh_interval);
    setOption({refresh_enabled: true});
}

/**
 * @brief Stops the refreshing loop
 * @returns {undefined}
 */
function stopAutoRefresh()
{
    setOption({refresh_enabled: false});
    /* We reload the options if they have changed since the last session */
    loadOptionsFromStorage();
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




        