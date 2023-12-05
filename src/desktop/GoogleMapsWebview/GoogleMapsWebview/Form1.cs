using Microsoft.Web.WebView2.Core;
using System.Collections.Generic;
using System.Net;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using System.Xml;

namespace GoogleMapsWebview
{
    public partial class Form1 : Form
    {
        public int indexProcessed = 0;
        public float totalDistanceBetweenMultiplePoints = 0;

        public List<string> addressesToLoad = new List<string>()
        {   
            // Not built in optimal route order
            // It will be rendered in optimal route order though due to processing /
            // magic logic on the web portion that finds the furthest two points from each other....
            "3201 E Platte Ave, Colorado Springs, CO 80909",
            "4200 Dillon Dr, Pueblo, CO 81008",
            "6310 S Us Highway 85-87, Fountain, CO 80817",
        };

        public Form1()
        {
            InitializeComponent();
        }

        private async void Form1_Load(object sender, EventArgs e)
        {
            loadWebview();
        }

        public async void loadWebview()
        {
            await webView21.EnsureCoreWebView2Async();
            // For debugging / clear cache
            //await webView21.CoreWebView2.Profile.ClearBrowsingDataAsync();
            webView21.Source = new Uri("{YOUR_URL_THAT_IS_ALLOWED_GOOGLE_API_KEY_REFERER}/google_maps.html?mode=embeddedMulti", UriKind.Absolute);
            webView21.WebMessageReceived += MessageReceived;
        }

        public async void MessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            string content = args.TryGetWebMessageAsString();
            if (!string.IsNullOrEmpty(content))
            {
                if (content.StartsWith("initMaps"))
                {
                    // Load the first address into the map and wait for it to finish rendering before adding the rest of the addresses
                    // via the message received callback
                    await webView21.ExecuteScriptAsync(@"addAddress('" + addressesToLoad[indexProcessed] + "');");
                    indexProcessed++;
                }
                else if (content.StartsWith("markerAdded"))
                {
                    if (addressesToLoad.ElementAtOrDefault(indexProcessed) != null)
                    {
                        // Add the rest of the addresses as markers...
                        await webView21.ExecuteScriptAsync(@"addAddress('" + addressesToLoad[indexProcessed] + "');");
                        indexProcessed++;
                    }
                    else
                    {
                        // Route and calculate all waypoints
                        await webView21.ExecuteScriptAsync(@"calcDistanceAll(sendDrivingDistanceResultToApp);");
                    }
                }
                else
                {
                    label1.Text = content;
                    totalDistanceBetweenMultiplePoints += float.Parse(Regex.Replace(content, "[^0-9.]", ""));
                    label2.Text = "Total distance between all points is " + totalDistanceBetweenMultiplePoints.ToString("0.00");
                }
            }
        }
    }
}
