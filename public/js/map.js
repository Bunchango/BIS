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
    const popups = []; 
    map.once("idle", function () {
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

                <div class="card-map">
                    <img class="imgBx" src="/${library.properties.profilePicture}" alt="Library Profile Picture" >
                
                    <div class="content-map">
                        <span class="viewBtn">
                            <a onclick="redirectToLibrary('${library.properties.libraryId}')" >View</a> 
                        </span>
                        <ul>
                            <li class="text-xl">${library.properties.libraryName}</li>
                            <li>Location: ${library.properties.formattedAddress}</li>
                            <li>Description: ${library.properties.description}</li>
                            
                        </ul>
                    </div>
                </div>
            `;

            // Set popup on mouseover
            map.on("mouseenter", "points", function (e) {
                if (e.features[0].properties.libraryId === library.properties.libraryId) {
                    popup.setLngLat(e.features[0].geometry.coordinates)
                        .setHTML(popupContent)
                        .addTo(map);
                    popups.push(popup); // Add popup to the array
                }
            });

            // Remove popup on mouseout
            map.on("mouseleave", "points", function () {
                // Check if the popup is not hovered before removing it
                if (!popups.some(p => p.isOpen())) {
                    popups.forEach(p => p.remove());
                    popups.length = 0; // Clear the array
                }
            });

            // Close popups on click outside
            map.on("click", function () {
                popups.forEach(p => p.remove());
                popups.length = 0; // Clear the array
            });

            
        });
    });

    
    
}
function redirectToLibrary(libraryId) {
        window.open(`http://localhost:5000/reader/library-profile/${libraryId}`, '_blank')
}


getLibraries();