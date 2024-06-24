var locations = new Array();
var map;
let directionsService;
let directionsRenderer;
var geocoder;
var infowindow;
var marker, i;
var mapLabel;
var tilesLoaded = false;

window.addEventListener("load", (event) => {
    initGoogleMap();
});

function initGoogleMap() {
    loadGoogleMap();
}

function addAddressMarker(addressObj) {
    var address = buildAddressFromObj(addressObj.address);

    geocoder.geocode({ 'address': address }, function (results, status) {
        if (results != null) {
            console.log(results);
            var latLng = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng(), addr: (addressObj.label ? addressObj.label : address) };

            if (addressObj.hasOwnProperty('id') && addressObj.id) {
                latLng.id = addressObj.id;
            }

            console.log(latLng);
            if (status == 'OK') {
                var marker = new google.maps.Marker({
                    position: latLng,
                    map: map
                });

                locations.push(latLng);

                var infoWindow = new google.maps.InfoWindow({
                    content: addressObj.label ? addressObj.label : address,
                });

                marker.addListener('click', function () {
                    infoWindow.open(map, marker);
                });

                // Redraw bounds
                var bounds = new google.maps.LatLngBounds();

                for (i = 0; i < locations.length; i++) {
                    position = new google.maps.LatLng(locations[i].lat, locations[i].lng);

                    bounds.extend(position)
                }

                map.fitBounds(bounds);

                if (locations.length == 1) {
                    map.setZoom(15);
                }

                var labelPosition = new google.maps.LatLng(latLng.lat, latLng.lng);

                mapLabel = new MapLabel({
                    text: addressObj.label ? addressObj.label : address,
                    position: labelPosition,
                    map: map,
                    fontSize: 14
                });

                if (mapInteractiveMode && mapInteractiveMode == "embedded") {
                    finishedAddingMarker();
                }

                if (mapInteractiveMode && (mapInteractiveMode == "embedded" || mapInteractiveMode == "embeddedMulti")) {
                    // Post event
                    window.chrome.webview.postMessage("markerAdded");
                }

            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        } else {
            if (mapInteractiveMode && (mapInteractiveMode == "embedded" || mapInteractiveMode == "embeddedMulti")) {
                window.chrome.webview.postMessage("addressInvalid," + addressObj.address);
                // Still need to fire marker added event so we can run the distance calculations even if some of the addresses are invalid:
                window.chrome.webview.postMessage("markerAdded");
            }
        }
    });
}

function finishedAddingMarker() {
    if (locations.length == 2) {
        calcDistTwo(0, 1, sendDrivingDistanceResultToApp);
    }
}

async function initMap() {
    tilesLoaded = false;
    const { Map } = await google.maps.importLibrary("maps");

    // Load map labels library once only...
    if (document.querySelector('.mapLabelsLibrary') == null) {
        var script = document.createElement('script');
        script.classList.remove('mapLabelsLibrary');
        script.classList.add('mapLabelsLibrary');
        script.src = 'js/maplabel.js';
        document.head.appendChild(script);
    }

    map = new Map(document.getElementById("map"), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
    });

    clearLocations();
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 10,
        center: new google.maps.LatLng(38.281219, -104.489109),
        streetViewControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN]
        }
    });

    map.addListener('tilesloaded', function () {
        if (mapInteractiveMode && (mapInteractiveMode == "embedded" || mapInteractiveMode == "embeddedMulti") && !tilesLoaded) {
            tilesLoaded = true;
            window.chrome.webview.postMessage("initMaps");
        }
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
    directionsRenderer.setMap(map); // Existing map object displays directions

    geocoder = new google.maps.Geocoder();

    infowindow = new google.maps.InfoWindow();

    for (i = 0; i < locations.length; i++) {
        marker = new google.maps.Marker({
            position: new google.maps.LatLng(locations[i][1], locations[i][2]),
            map: map
        });

        google.maps.event.addListener(marker, 'click', (function (marker, i) {
            return function () {
                infowindow.setContent(locations[i][0]);
                infowindow.open(map, marker);
            }
        })(marker, i));
    }
}

function loadGoogleMap() {
    initMap();
}

function buildAddressFromObj(addressObj) {

    // If it's already a string, return it.
    if (typeof addressObj === 'string') {
        return addressObj;
    }

    var returnAddr = "";

    if (addressObj.name) {
        returnAddr += addressObj.name;
    }

    if (addressObj.address1) {
        returnAddr += ", " + addressObj.address1;
    }

    if (addressObj.address2) {
        returnAddr += " " + addressObj.address2;
    }

    if (addressObj.city) {
        returnAddr += ", " + addressObj.city;
    }

    if (addressObj.region) {
        returnAddr += " " + addressObj.region;
    }

    if (addressObj.postalCode) {
        returnAddr += "  " + addressObj.postalCode;
    }

    if (addressObj.country) {
        returnAddr += " " + addressObj.country;
    }

    return returnAddr;
}

function addAddressViaStr() {
    var strAddr = document.getElementById('addressText').value;
    if (strAddr) {
        addAddressMarker({ address: strAddr, label: strAddr, id: locations.length + 1 });
    }
}

function addAddress(addr) {
    if (addr) {
        addAddressMarker(addr);
    }
}

let calculateDrivingDistanceBetweenPoints = function (addressObj1, addressObj2) {
    return new Promise(function (resolve, reject) {
        const route = {
            origin: addressObj1,
            destination: addressObj2,
            travelMode: 'DRIVING'
        }

        directionsService.route(route,
            function (response, status) { // anonymous function to capture directions
                if (status !== 'OK') {
                    reject(new Error('Directions request failed due to ' + status));
                } else {
                    directionsRenderer.setDirections(response); // Add route to the map
                    var directionsData = response.routes[0].legs[0]; // Get data about the mapped route
                    if (!directionsData) {
                        reject(new Error('Directions request failed'));
                    }
                    else {
                        var drivingDistance = directionsData.distance.text;

                        var midpointLatLong = midpoint(addressObj1.lat, addressObj1.lng, addressObj2.lat, addressObj2.lng);
                        var labelPosition = new google.maps.LatLng(midpointLatLong.lat, midpointLatLong.lng);

                        mapLabel = new MapLabel({
                            text: drivingDistance,
                            position: labelPosition,
                            map: map,
                            fontSize: 24
                        });

                        resolve(drivingDistance);
                    }
                }
            }
        );
    });
};

let calculateDrivingDistanceMulti = function (allAddresses, optimizeRoutes) {
    return new Promise(function (resolve, reject) {
        // Reoder first and last origin based on furthest points...
        // This will help with route optimization
        var newAddresses = allAddresses.slice(0);
        var longestDistanceBetweenPoints = 0.00;
        var startIndex = null;
        var endIndex = null;

		if(optimizeRoutes){
			// Bubble
			for (var k = 0; k < newAddresses.length; k++) {
				for (var l = 0; l < newAddresses.length; l++) {
					var tempDist = parseFloat(calculateP2PDistanceBetweenPoints(newAddresses[k], newAddresses[l]));
					if (tempDist > longestDistanceBetweenPoints) {
						longestDistanceBetweenPoints = tempDist;
						startIndex = k;
						endIndex = l;
					}
				}
			}
		}else{
			startIndex = 0;
			endIndex = allAddresses.length - 1;
		}

        var newAddressesReordered = new Array();
        if (startIndex != null && endIndex != null) {
            newAddressesReordered.push(newAddresses[startIndex])
            for (var k = 0; k < newAddresses.length; k++) {
                if (k != startIndex && k != endIndex) {
                    newAddressesReordered.push(newAddresses[k])
                }
            }
            newAddressesReordered.push(newAddresses[endIndex]);
        } else {
            newAddressesReordered = newAddresses.slice(0);
        }

        var wayptAddresses = newAddressesReordered.slice(0);
        var originalWayptAddresses = newAddressesReordered.slice(0);
        wayptAddresses.splice(0, 1);
        wayptAddresses.splice(wayptAddresses.length - 1, 1);

        const route = {
            origin: newAddressesReordered[0],
            destination: newAddressesReordered[newAddresses.length - 1],
            travelMode: 'DRIVING'
        }

        if (wayptAddresses.length) {
            var waypts = new Array();
            for (var j = 0; j < wayptAddresses.length; j++) {
                waypts.push({
                    location: wayptAddresses[j].lat + "," + wayptAddresses[j].lng,
                    stopover: true,
                });
            }

            route.waypoints = waypts;
            route.optimizeWaypoints = optimizeRoutes;
        }

        directionsService.route(route,
            function (response, status) { // anonymous function to capture directions
                if (status !== 'OK') {
                    reject(new Error('Directions request failed due to ' + status));
                } else {
                    directionsRenderer.setDirections(response); // Add route to the map
                    var drivingDistance = 0.00;

                    const routeResp = response.routes[0];

                    var orderOfLegs = new Array();

                    if (optimizeRoutes) {
                        orderOfLegs.push(originalWayptAddresses[0]);
                        if (routeResp.waypoint_order.length) {
                            for (let z = 0; z < routeResp.waypoint_order.length; z++) {
                                orderOfLegs.push(originalWayptAddresses[routeResp.waypoint_order[z] + 1]);
                            }
                        }
                        orderOfLegs.push(originalWayptAddresses[originalWayptAddresses.length - 1]);
                    } else {
                        for (let z = 0; z < originalWayptAddresses.length; z++) {
                            orderOfLegs.push(originalWayptAddresses[z]);
                        }
                    }

                    // For each route, display summary information.
                    for (let k = 0; k < routeResp.legs.length; k++) {
						var legDistance = routeResp.legs[k].distance.text.replace(/[^\d.-]+/g, '');
                        var splitStr = "{SPLIT_SEPARATOR}";
                        var strToPost = "legInfo," + legDistance + splitStr + routeResp.legs[k].start_address + splitStr + routeResp.legs[k].end_address;
                        strToPost += splitStr + orderOfLegs[k].addr + splitStr + orderOfLegs[k + 1].addr;

                        // Latitude and longitude
                        strToPost += splitStr + orderOfLegs[k].lat + splitStr + orderOfLegs[k].lng;
                        strToPost += splitStr + orderOfLegs[k + 1].lat + splitStr + orderOfLegs[k + 1].lng;

                        // Ids
                        if (orderOfLegs[k].hasOwnProperty('id') && orderOfLegs[k].id) {
                            strToPost += splitStr + orderOfLegs[k].id;
                        } else {
                            strToPost += splitStr + "";
                        }

                        if (orderOfLegs[k + 1].hasOwnProperty('id') && orderOfLegs[k + 1].id) {
                            strToPost += splitStr + orderOfLegs[k + 1].id;
                        } else {
                            strToPost += splitStr + "";
                        }

                        if (mapInteractiveMode && (mapInteractiveMode == "embedded" || mapInteractiveMode == "embeddedMulti")) {
                            window.chrome.webview.postMessage(strToPost);
                        } else {
                            console.log(strToPost);
                        }
						
                        drivingDistance += parseFloat(legDistance);

                        var midpointLatLong = midpoint(routeResp.legs[k].start_location.lat(), routeResp.legs[k].start_location.lng(), routeResp.legs[k].end_location.lat(), routeResp.legs[k].end_location.lng());
                        var labelPosition = new google.maps.LatLng(midpointLatLong.lat, midpointLatLong.lng);

                        mapLabel = new MapLabel({
                            text: routeResp.legs[k].distance.text,
                            position: labelPosition,
                            map: map,
                            fontSize: 24
                        });

                    }

                    var directionsData = response.routes[0].legs[0]; // Get data about the mapped route
                    if (!directionsData) {
                        reject(new Error('Directions request failed'));
                    }
                    else {
                        resolve(drivingDistance.toFixed(2));
                    }
                }
            }
        );
    });
};

function calculateP2PDistanceBetweenPoints(addressObj1, addressObj2) {
    // Calculate and display the distance between markers
    var distance = haversine_distance(addressObj1, addressObj2);
    return distance.toFixed(2);
}

function calcDistTwo(startIndex, endIndex, callbackFunc) {
    if (typeof locations[startIndex] !== 'undefined' && typeof locations[endIndex] !== 'undefined') {
        var resp = calculateDrivingDistanceBetweenPoints(locations[startIndex], locations[endIndex]).then(function (result) {
            callbackFunc(result);
        }, function (error) {
            callbackFunc(error);
        });
    }
}

function calcDistanceAll(callbackFunc, optimizeRoutes) {
	if(typeof optimizeRoutes === typeof undefined){
		optimizeRoutes = false;
	}
	
    var resp = calculateDrivingDistanceMulti(locations, optimizeRoutes).then(function (result) {
        callbackFunc(result);
    }, function (error) {
        callbackFunc(error);
    });
}

function calcDistTwoP2P(startIndex, endIndex) {
    if (typeof locations[startIndex] !== 'undefined' && typeof locations[endIndex] !== 'undefined') {
        return calculateP2PDistanceBetweenPoints(locations[startIndex], locations[endIndex]);
    }
}

function haversine_distance(mk1, mk2) {
    var R = 3958.8; // Radius of the Earth in miles
    var rlat1 = mk1.lat * (Math.PI / 180); // Convert degrees to radians
    var rlat2 = mk2.lat * (Math.PI / 180); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = (mk2.lng - mk1.lng) * (Math.PI / 180); // Radian difference (longitudes)

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
    return d;
}

function midpoint(lat1, lng1, lat2, lng2) {

    lat1 = deg2rad(lat1);
    lng1 = deg2rad(lng1);
    lat2 = deg2rad(lat2);
    lng2 = deg2rad(lng2);

    dlng = lng2 - lng1;
    Bx = Math.cos(lat2) * Math.cos(dlng);
    By = Math.cos(lat2) * Math.sin(dlng);
    lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2),
        Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));
    lng3 = lng1 + Math.atan2(By, (Math.cos(lat1) + Bx));

    return { lat: (lat3 * 180) / Math.PI, lng: (lng3 * 180) / Math.PI };
}

function deg2rad(degrees) {
    return degrees * Math.PI / 180;
};

function clearLocations() {
    locations = new Array();
}
