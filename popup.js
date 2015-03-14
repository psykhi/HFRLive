// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var started = false;
var tabid = 0;
var button;

function onRefreshButtonClicked()
{

    if (started)
    {
        sendContentScriptActivate(false);
    }
    else
    {
        sendContentScriptActivate(true);
    }
}

function sendContentScriptActivate(state)
{
    if (state)
    {
        chrome.tabs.sendMessage(tabid, "start", onNewRefreshingState);
    }
    else
    {
        displayState(state);
        chrome.tabs.sendMessage(tabid, "stop", onNewRefreshingState);
    }
}
function displayState(state)
{
    if (state)
    {
        //Refreshing is ON
        document.getElementById("refresh_button").innerHTML = "OFF";
        chrome.pageAction.setIcon({tabId: tabid, path: "images/icon_16_on.png"});
    }
    else
    {
        //Refreshing is OFF
        chrome.pageAction.setIcon({tabId: tabid, path: "images/icon_16.png"});
        document.getElementById("refresh_button").innerHTML = "ON";
    }
}

/**
 * Get the current URL.
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

function onNewRefreshingState(state)
{
    started = state;
    displayState(state);
}


function onNotificationCheckboxChange()
{
    console.log("changed checkbox");
    if (document.getElementById("checkbox_notifications").checked)
    {
        chrome.tabs.sendMessage(tabid, "enable_notifications", onNotificationStatusChange);
    }
    else
    {
        chrome.tabs.sendMessage(tabid, "disable_notifications", onNotificationStatusChange);
    }
}


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

/**
 * Actual script : we wait for the DOM to be loaded
 */

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-60766637-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

document.addEventListener('DOMContentLoaded', function() {
    button = document.getElementById("refresh_button");
    button.addEventListener('click', onRefreshButtonClicked);
    document.getElementById("checkbox_notifications").addEventListener('change', onNotificationCheckboxChange);

    getCurrentTabUrl(function(tab) {
        var opt = {
            type: "basic",
            title: "Primary Title",
            message: "Primary message to display"

        }
        chrome.tabs.sendMessage(tabid, "get_state", onNewRefreshingState);

        // chrome.notifications.create( "hello",opt,function(string notificationId) {});
    });
});