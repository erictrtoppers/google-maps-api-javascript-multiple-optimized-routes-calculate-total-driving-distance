using GoogleMapsWebview.Classes;
using Microsoft.Web.WebView2.Core;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using System.Xml;

namespace GoogleMapsWebview
{
    public partial class Form1 : Form
    {
        public int indexProcessed = 0;
        public float totalDistanceBetweenMultiplePoints = 0;
        public string splitStr = "{SPLIT_SEPARATOR}";

        public List<MapsAddress> addressesToLoad = new List<MapsAddress>()
        {
            // Not built in optimal route order
            // It will be rendered in optimal route order though due to processing /
            // magic logic on the web portion that finds the furthest two points from each other....
            new MapsAddress { Address = "3201 E Platte Ave, Colorado Springs, CO 80909", Label = "Colorado Springs Walmart" },
            new MapsAddress { Address = "4200 Dillon Dr, Pueblo, CO 81008", Label = "Pueblo Walmart" },
            new MapsAddress { Address = "6310 S Us Highway 85-87, Fountain, CO 80817", Label = "85/87 Fountain Walmart" },
            new MapsAddress { Address = "123 Fake Street", Label = "No exist..."}
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
            string invalidAddressStart = "addressInvalid,";
            string legInfo = "legInfo,";

            if (!string.IsNullOrEmpty(content))
            {
                if (content.StartsWith("initMaps"))
                {
                    // Load the first address into the map and wait for it to finish rendering before adding the rest of the addresses
                    // via the message received callback
                    await webView21.ExecuteScriptAsync(@"addAddress(" + JsonSerializer.Serialize(addressesToLoad[indexProcessed]) + ");");
                    indexProcessed++;
                }
                else if (content.StartsWith("markerAdded"))
                {
                    if (addressesToLoad.ElementAtOrDefault(indexProcessed) != null)
                    {
                        // Add the rest of the addresses as markers...
                        await webView21.ExecuteScriptAsync(@"addAddress(" + JsonSerializer.Serialize(addressesToLoad[indexProcessed]) + ");");
                        indexProcessed++;
                    }
                    else
                    {
                        // Route and calculate all waypoints
                        // Second parameter to calcDistanceAll is whether or not the waypoints should be optimized (if you want an optimized route, pass true, otherwise leave off the paramter or pass false)
                        await webView21.ExecuteScriptAsync(@"calcDistanceAll(sendDrivingDistanceResultToApp, true);");
                    }
                }
                else if (content.StartsWith(invalidAddressStart))
                {
                    string invalidAddress = content.Substring(content.IndexOf(invalidAddressStart) + invalidAddressStart.Length);
                    MessageBox.Show("Address \"" + invalidAddress + "\" is invalid!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                else if (content.StartsWith(legInfo))
                {
                    var infoStr = content.Substring(legInfo.Length);
                    var pieces = infoStr.Split(splitStr);
                    decimal distance = Convert.ToDecimal(pieces[0]);
                    string startAddress = pieces[1];
                    string endAddress = pieces[2];
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
