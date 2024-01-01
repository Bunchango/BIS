mapboxgl.accessToken = "pk.eyJ1IjoibWlrZTEyNSIsImEiOiJjbHF0Mnd0cDY0c2t2Mmlwd25kczA0bXNzIn0.t0Y3FxIiZkr93zTb3nk8zg";

const map = new mapboxgl.Map({
    container: 'map',
    style: "mapbox://styles/mapbox/streets-v11",
    zoom: 13,
})

// Get user's current location
navigator.geolocation.getCurrentPosition(success, error);

function success(position) {
    var lng = position.coords.longitude;
    var lat = position.coords.latitude;

    map.setCenter([lng, lat]);
    
    // Add a marker at the user's location
    new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
}

function error() {
    console.error('Unable to retrieve your location');
}

// Fetch libraries from API
async function getLibraries() {
    const res = await fetch("/reader/get_libraries");
    const data = await res.json();

    const libraries = data.data.map(library => {
        return {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [library.location.coordinates[0], library.location.coordinates[1]]
            },
            properties: {
                libraryName: library.username,
                libraryId: library._id,
                icon: "shop",
                formattedAddress: library.location.formattedAddress,
                description: library.description,
                profilePicture: library.profilePicture, 
            }
        }
    });

    loadMap(libraries)
}

// Plot points onto map
function loadMap(libraries) {
    map.on("load", function () {
        map.addLayer({
            id: "points",
            type: "symbol",
            source: {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: libraries,
                },
            },
            layout: {
                "icon-image": "{icon}-15",
                "icon-size": 1.5,
                "text-field": "{libraryName}",
                "text-offset": [0, 0.9],
                "text-anchor": "top",
            },
        });

        // Add a popup to each feature
        libraries.forEach((library) => {
            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
            });

            // Set popup content
            const popupContent = `
                <strong>${library.properties.libraryName}</strong><br>
                ${library.properties.formattedAddress}<br>
                ${library.properties.description}<br>
                <img src="/${library.properties.profilePicture}" alt="Library Image" style="max-width: 100%;">
            `;

            // Set popup on mouseover
            map.on("mouseenter", "points", function (e) {
                if (e.features[0].properties.libraryId === library.properties.libraryId) {
                    popup.setLngLat(e.features[0].geometry.coordinates)
                        .setHTML(popupContent)
                        .addTo(map);
                }
            });

            // Remove popup on mouseout
            map.on("mouseleave", "points", function () {
                popup.remove();
            });
        });
    });

    map.on("click", "points", function (e) {
        const libraryId = e.features[0].properties.libraryId;
        window.location.href = `/reader/library-profile/${libraryId}`;
    });

    map.on("mouseenter", "points", function () {
        map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "points", function () {
        map.getCanvas().style.cursor = "";
    });
}



getLibraries();