/**
 * @file popup.js
 * @author psykhi (alex@theboredengineers.com)
 * @date March 2015
 * @brief Popup window script
 * 
 * Javascript of popup.html. 
 */


/**
 * Our tabId
 * @type Number
 */
var tabid = 0;
/**
 * Our tab options
 * @type option
 */
var options;

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


document.addEventListener('DOMContentLoaded', function() {
    var button = document.getElementById("refresh_button");
    button.addEventListener('click', onRefreshButtonClicked);
    document.getElementById("checkbox_notifications").addEventListener('change',
            onNotificationCheckboxChange);

    getCurrentTabUrl(function(tab) {
        chrome.tabs.sendMessage(tabid, {get_options: true}, onNewOptions);
    });
});

/****************************END OF SCRIPT*************************************/

/**
 * @brief OnClick listener for the auto-refresh button
 * @returns {undefined}
 */
function onRefreshButtonClicked()
{

    if (options.refresh_enabled)
    {
        sendContentScriptActivate(false);
    }
    else
    {
        sendContentScriptActivate(true);
    }
}
/**
 * @brief Sends the activation command to the content script
 * @param {type} state
 * @returns {undefined}
 */
function sendContentScriptActivate(state)
{

    if (state)
    {
        chrome.tabs.sendMessage(tabid, {start: true}, onNewOptions);

    }
    else
    {
        displayState(state);
        chrome.tabs.sendMessage(tabid, {stop: true}, onNewOptions);
    }
}
/**
 * @brief Display the live state
 * @param {type} state
 * @returns {undefined}
 */
function displayState(state)
{
    if (state)
    {
        //Refreshing is ON
        document.getElementById("refresh_button").className = "live_on";
        chrome.pageAction.setIcon({tabId: tabid, path: "images/icon_16_on.png"});
        document.getElementById("checkbox_notifications").disabled = false;
    }
    else
    {
        //Refreshing is OFF
        chrome.pageAction.setIcon({tabId: tabid, path: "images/icon_16.png"});
        document.getElementById("refresh_button").className = "live_off";
        document.getElementById("checkbox_notifications").disabled = true;
    }
}

/**
 * Get the current tab ID and save it.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 **/
function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        tabid = tabs[0].id;
        callback(tabs[0]);
    });
}
/**
 * @brief Updates the UI with the new options
 * @param {type} option
 * @returns {undefined}
 */
function onNewOptions(option)
{
    options = option;
    displayState(option.refresh_enabled);
    onNotificationStatusChange(option.notifications_enabled);
}

/**
 * Notification checkbox callback
 * @returns {undefined}
 */
function onNotificationCheckboxChange()
{
    if (document.getElementById("checkbox_notifications").checked)
    {
        chrome.tabs.sendMessage(tabid, {enable_notifications: true},
        onNotificationStatusChange);
    }
    else
    {
        chrome.tabs.sendMessage(tabid, {disable_notifications: true},
        onNotificationStatusChange);
    }
}

/**
 * Update the UI with the new notification status
 * @param {type} state
 * @returns {undefined}
 */
function onNotificationStatusChange(state)
{
    if (state)
    {
        document.getElementById("checkbox_notifications").checked = true;
    }
    else
    {
        document.getElementById("checkbox_notifications").checked = false;
    }
}

