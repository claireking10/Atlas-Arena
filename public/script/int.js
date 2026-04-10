/*
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-nocheck
// [START maps_3d_marker_click_event]

function addMarker(entry, Map3DElement, Marker3DInteractiveElement, map){
// Create the interactive marker and set the attributes.
    

    //const newDiv = document.createElement("div");
    //newDiv.textContent = "table info: "+entry.name + " " + entry.description + " " + parseFloat(entry.posX) + " " + entry.posY;
    //document.body.appendChild(newDiv);

    const interactiveMarker = new Marker3DInteractiveElement({
        position: { lat: parseFloat(entry.posX), lng: parseFloat(entry.posY), altitude: 100 },
        sizePreserved: true,
        altitudeMode: 'RELATIVE_TO_MESH',
        extruded: true,
        label: entry.name,
    });

    interactiveMarker.addEventListener('gmp-click', (event) => {
        showMapPopup(entry);
    });

    return interactiveMarker;
}

export function randomPin(){
    const randomPin = citiesTable[Math.floor(Math.random() * citiesTable.length)];
    const cam = {
        center: { lat: parseFloat(randomPin.posX), lng: parseFloat(randomPin.posY), altitude: 7500 },
        range: 1500,
        tilt: 0,
        heading: 0,
    };

    
    map.flyCameraTo({
        endCamera: cam,
        durationMillis: 10000,
    });
    

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        async function execute() {
            await sleep(7000); // Wait 1 second
            window.location.href = `/quiz?city=${encodeURIComponent(JSON.stringify(randomPin))}`;
        }
    execute();

    
    
}

let map;


async function initMap() {
    // Include the interactive marker class
    const { Map3DElement, Marker3DInteractiveElement } =
        await google.maps.importLibrary('maps3d');

    //const container = document.getElementById("map-placeholder");
    // We will use this to place the camrea for the intial view but also to fly around the starting point.
    const originalCamera = {
        center: { lat: 38.7946, lng: -106.5348, altitude: 5000000 },
        range: 1500,
        tilt: 0,
        heading: 0,
    };

    map = new Map3DElement({
        ...originalCamera,
        mode: 'SATELLITE',
        gestureHandling: 'GREEDY',
    });

    //const newDiv = document.createElement("div");
    //newDiv.textContent = "table info: "+citiesTable;
    //document.body.appendChild(newDiv);



    citiesTable.forEach((element, index, array) => {
        map.append(addMarker(element, Map3DElement, Marker3DInteractiveElement, map))
    });

    map.append(addMarker({name: 'Test City', description: 'Indonesia\'s sprawling, sinking capital on the northwest coast of Java is one of the worlds most chaotic and captivating megacities. Home to over 30 million in its metro area, it is a city of extreme contrasts with its gleaming malls beside flooding kampung.', posX: '40', posY: '50'}, Map3DElement, Marker3DInteractiveElement));

    document.body.append(map);

    // Create popup div
    const popup = document.createElement('div');
    popup.className = 'map-popup';
    document.body.appendChild(popup);

    // Function to show popup
    window.showMapPopup = (entry) => {
        popup.innerHTML = `
            <div class="map-popup-content">
                <button class="popup-close-btn">&times;</button>
                <div class="popup-header">
                    <div class="flag-placeholder">🇺🇸</div>
                    <h3 class="popup-title">${entry.name}</h3>
                </div>
                <p class="popup-description">${entry.description}</p>
                <div class="popup-actions">
                    <button class="quiz-start-btn">Start Quiz</button>
                </div>
            </div>
        `;
        popup.style.display = 'block';

        const closeBtn = popup.querySelector('.popup-close-btn');
        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        const startBtn = popup.querySelector('.quiz-start-btn');
        startBtn.addEventListener('click', () => {
            alert('Starting quiz for ' + entry.name);
        });
    };

    //const newDiv = document.createElement("div");
    //newDiv.textContent = "table info: "+addMarker({name: 'Test City', description: 'Test description', posX: '40', posY: '50'}, Map3DElement, Marker3DInteractiveElement);
    //document.body.appendChild(newDiv);

    //console.log("test");
}

//console.log("test");
initMap();

window.addEventListener("message", (event) => {
    if (event.data === "runRandomPin") {
        randomPin();
    }
});

//setTimeout(function() { randomPin(); }, 10000);
// [END maps_3d_marker_click_event]