# Map and Optimize Routes Using Multiple Addresses via Google Maps API
## A JavaScript Integration

## About

This project allows you to calculate the total driving distance between multiple addresses (or waypoints) using the most optimized routes via the Google Maps V3 JavaScript API.

It is a pure JavaScript implementation that you can interact with via the web or embed as a webview into an application (for example, an Android or C# Winforms application).  

To use as an embedded webview in an application, please refer to the `desktop` folder which contains a .NET Webview2 application sample complete with interactive calls and response objects.  

The URL parameter of `mode` determines whether or not the web application should render in a mode that allows interaction or direct function calls as an embedded app:

Interactive mode URL:

`google_maps.html`

Embedded mode URL:

`google_maps.html?mode=embeddedMulti`

## Setup

1. Get a Google Maps API key.
2. Upload the web files onto a web server somewhere that is reachable using a URL.

### Web

In `google_maps.html`, repleace {API_KEY_HERE} with your Google Maps API key.

### Desktop Application

In `Form1.cs`, replace {YOUR_URL_THAT_IS_ALLOWED_GOOGLE_API_KEY_REFERER} with the URL to the web portion that you're hosting on one of your domains.
