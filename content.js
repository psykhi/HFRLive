/**
 * @file content.js
 * @author psykhi (alex@theboredengineers.com)
 * @date March 2015
 * @brief Content script
 * 
 * The script takes care of reloading the page and appending the new messages to
 * it. Notifications are sent if the tab is not visible.
 */





var context;
/***********************SCRIPT************************************/

// Are we new? Or just refreshed? We ask for our context to the background page
chrome.runtime.sendMessage({get_context: true}, function(response) {

    if (response.context)
    {

        context = response.context;
        console.log(context);
        context.ready_to_refresh = true;
//We save the href template to respond to a message
        context.href_string = getElementByXpath
                ('//*[@id="mesdiscussions"]/table[3]/tbody/tr/td[2]/div[1]/div[1]/span/a/a').
                href;
        context.href_string = context.href_string.replace(/numrep=(.*?)&/, "numrep=trav&");

// We start refreshing or not
        if (context.state.refresh_enabled)
        {
            var new_page = getCurrentPageIndex();
            //Now we will check if we are on a new page so that new_page = old page +1
            if (((context.current_page + 1) === new_page) || (context.current_page === new_page))
            {
                startAutoRefresh();
                $(".messagetable").last()[0].scrollIntoView(true);
                if (new_page === getCurrentLatestPageIndex())
                {
                    buildNotification($(".messagetable").last());
                }
            }
            else
            {
                stopAutoRefresh();
            }
        }

        setMessageListener();
        setQuickResponseFocusCallback();
        //FIXME if we are selected
        context.current_page = getCurrentPageIndex();
    }
    else
    {
        /* Something wrong happened */
        console.error("Could not get a context object !");
    }
});


/*************************END OF SCRIPT****************************/

function setQuickResponseFocusCallback()
{

    $(".reponserapide").focusin(function(e)
    {
        context.should_scroll = false;
    });
    $(".reponserapide").focusout(function(e)
    {
        context.should_scroll = true;
    });

}
function setMessageListener()
{
    chrome.runtime.onMessage.addListener(
            function(message, sender, sendResponse)
            {
                if (message.start)
                {
                    if (!context.state.refresh_enabled) {
                        startAutoRefresh();
                        sendResponse(context.state);
                    }
                }
                else if (message.stop)
                {
                    stopAutoRefresh();
                    sendResponse(context.state);
                }
                else if (message.get_state)
                {
                    sendResponse(context.state);
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
}




function registerNewOptions(opt)
{
    if (opt.new_refresh_delay)
    {
        changeRefreshInterval(opt.new_refresh_delay);
    }
    if (typeof opt.new_scroll_duration !== 'undefined')
    {
        context.options.scroll_duration = opt.new_scroll_duration;
    }
}

function changeRefreshInterval(val)
{
    context.options.refresh_interval = val;
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
    chrome.runtime.sendMessage({is_selected: true}, function(isSelected) {
        if (!isSelected) {
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
            if (avatar==="")
                notif.avatarUrl = "images/icon_80.png";
            chrome.runtime.sendMessage(request);
        }
    });
}
/**
 * 
 * @returns current page ex "33256"
 */
function getCurrentPageIndex()
{
    return parseInt($(".cBackHeader").find("b:last").last().get(0).innerText);
}
/**
 * 
 * @returns current page ex "33256"
 */
function getCurrentLatestPageIndex()
{
    return parseInt($(".cBackHeader .left").children().last().get(0).innerText);
}
/**
 * @brief Gets the latest page index
 * @param {type} html
 * @returns last page ex :"33256"
 */
function getLatestPageIndex(html)
{
    return parseInt($(html).find(".cBackHeader .left ").children().last().get(0).innerText);
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
                save_context: context
            };
    chrome.runtime.sendMessage(request);
}

/**
 * @brief Finds the URL to a given message
 * @param {type} message
 * @returns {@exp;context.href_string@call;replace}
 */
function getMessageLink(message)
{
    var message_value = getMessageId(message);
    return context.href_string.replace("trav", message_value);
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
    if (context.ready_to_refresh && context.state.refresh_enabled && context.should_scroll) {
        //console.log("refreshing");
        context.ready_to_refresh = false;
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
                context.current_page = current_page;
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
                        $(".messagetable").last().after(message).fadeIn(context.options.scroll_duration);
                    }
                    // We change the quick response link
                    updateQuickResponse($(".messagetable").last());
                    //We notify the user
                    buildNotification($(".messagetable").last());
                    $('html, body').on("scroll mousedown DOMMouseScroll mousewheel keyup", function() {
                        $('html, body').stop();
                    });

                    if (context.options.scroll_duration === 0)
                    {
                        $(".messagetable").last()[0].scrollIntoView(true);
                    } else
                    {
                        //We scroll to the last read message
                        $('html, body').animate({
                            scrollTop: target.offset().top
                        }, context.options.scroll_duration, function() {
                            $('html, body').off("scroll mousedown DOMMouseScroll mousewheel keyup");
                        });
                    }
                }
                context.ready_to_refresh = true;
            }
            catch (err)
            {
                console.log(err.stack);
                context.ready_to_refresh = true;
            }
        });
    }
    else
    {

        //console.log("not ready to refresh.");
    }
    if (context.state.refresh_enabled)
        setTimeout(refresh, context.options.refresh_interval);
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
    if (context.state.notifications_enabled)
    {
        try {
            var avatarUrl = "";
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

    setTimeout(refresh, context.options.refresh_interval);
    setOption({refresh_enabled: true});

}

/**
 * @brief Stops the refreshing loop
 * @returns {undefined}
 */
function stopAutoRefresh()
{
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
        context.state.refresh_enabled = opt.refresh_enabled;
    }
    if (typeof opt.notifications_enabled !== 'undefined')
    {
        context.state.notifications_enabled = opt.notifications_enabled;
    }
    chrome.runtime.sendMessage({save_context: context});
}




        