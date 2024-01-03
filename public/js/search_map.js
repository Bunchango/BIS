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

async function getLibraries() {
    const title = document.getElementById('title').value;
    const publishedBefore = document.getElementById('publishedBefore').value;
    const publishedAfter = document.getElementById('publishedAfter').value;
    const available = document.getElementById('available').checked ? 'on' : 'off';
    const category = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(input => input.value);

    const url = new URL("http://localhost:5000/reader/filter_books");
    url.search = new URLSearchParams({
        title,
        publishedBefore,
        publishedAfter,
        available,
        category
    }).toString();

    const res = await fetch(url);
    const books = await res.json();

    const librariesMap = new Map();

    books.data.forEach((book) => {
        const libraryId = book.library._id.toString();

        // If the library is not in the map, add it with an array containing the current book
        if (!librariesMap.has(libraryId)) {
            librariesMap.set(libraryId, {
                library: book.library,
                books: [book],
            });
        } else {
            // If the library is already in the map, add the current book to its array
            librariesMap.get(libraryId).books.push(book);
        }
    });

    // Convert the Map values to an array to get the final libraries list
    const data = Array.from(librariesMap.values());
    
    const libraries = data.map(library => {
        return {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [library.library.location.coordinates[0], library.library.location.coordinates[1]]
            },
            properties: {
                libraryName: library.library.username,
                libraryId: library.library._id,
                icon: "shop",
                formattedAddress: library.library.location.formattedAddress,
                description: library.library.description,
                profilePicture: library.library.profilePicture, 
                books: library.books,
            }
        }
    })

    loadMap(libraries);
}

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

        libraries.forEach((library) => {
            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
            });

            const popupContent = `
            <div class="card-map">
                <div class="imgBx" style="background-image: url('${library.properties.profilePicture}');"></div>
                <div class="content">
                    <span class="viewBtn">
                        <a onclick="redirectToLibrary('${library.properties.libraryId}')" >View</a> 
                    </span>
                    <ul>
                        <li>${library.properties.libraryName}</li>
                        <li>Location: ${library.properties.formattedAddress}</li>
                        <li>Books:</li>
                        <li>
                            <ul class="listOfBook">
                                ${library.properties.books.map(book => `<li><a onclick="redirectToBook('${book._id}')" class="cursor-pointer text-blue-500">${book.title}</a></li>`).join('')}
                            </ul>
                        </li>
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

function redirectToBook(bookId) {
    window.open(`http://localhost:5000/reader/book_detail/${bookId}`, '_blank')
}

function redirectToLibrary(libraryId) {
    window.open(`http://localhost:5000/reader/library-profile/${libraryId}`, '_blank')
}

getLibraries()
