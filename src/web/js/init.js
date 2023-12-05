const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var mapInteractiveMode = urlParams.get('mode')

window.addEventListener("load", (event) => { 
    checkParams();
});

function sendDrivingDistanceResultToApp(result) {
    if (mapInteractiveMode && (mapInteractiveMode == "embedded" || mapInteractiveMode == "embeddedMulti")) {
        window.chrome.webview.postMessage(result);
    } else {
        console.log(result);
    }
}

function checkParams() {
    if (mapInteractiveMode && (mapInteractiveMode == "embedded" || mapInteractiveMode == "embeddedMulti")) {
        document.getElementById('map').style.height = "100vh";
        document.getElementById('calcPointDistancesArea').classList.remove('hide');
        document.getElementById('calcPointDistancesArea').classList.add('hide');
        document.getElementById('addAddressToMap').classList.remove('hide');
        document.getElementById('addAddressToMap').classList.add('hide');
    }
}
