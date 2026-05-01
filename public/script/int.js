/*
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-nocheck
// [START maps_3d_marker_click_event]


// take google earth variables and a marker to add, and place it on the map.
function addMarker(entry, Map3DElement, Marker3DInteractiveElement, map){
    // Create the interactive marker and set the attributes.
    const interactiveMarker = new Marker3DInteractiveElement({
        position: { lat: parseFloat(entry.posX), lng: parseFloat(entry.posY), altitude: 100 },
        sizePreserved: true,
        altitudeMode: 'RELATIVE_TO_MESH',
        extruded: true,
        label: entry.name,
    });

    // add click functionality
    interactiveMarker.addEventListener('gmp-click', (event) => {
        showMapPopup(entry);
    });

    return interactiveMarker;
}

// Selects a random pin as a target for a quiz and starts the quiz. Called by "Start Random Quiz"
export function randomPin(){
    const randomPin = citiesTable[Math.floor(Math.random() * citiesTable.length)];
    
    // define target camera position
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
    

    // wait for a few seconds and then start the quiz
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        async function execute() {
            await sleep(7000); // Wait 7 seconds
            window.top.location.href = `/quiz?city=${encodeURIComponent(JSON.stringify(randomPin))}`; // change from map to quiz inside iframe
        }
    execute();

    
    
}

// take a target city and fly to/start the quiz for it
export function startQuiz(pin){
    
    // define target camera position
    const cam = {
        center: { lat: parseFloat(pin.posX), lng: parseFloat(pin.posY), altitude: 7500 },
        range: 1500,
        tilt: 0,
        heading: 0,
    };

    
    map.flyCameraTo({
        endCamera: cam,
        durationMillis: 2000,
    });
    

    // start the quiz after flying to it
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        async function execute() {
            await sleep(1400); // Wait 1.4 seconds
            window.top.location.href = `/quiz?city=${encodeURIComponent(JSON.stringify(pin))}`; // change from map to quiz inside iframe
        }
    execute();

    
    
}



let map;

// function for google earth API initialization
async function initMap() {
    // Include the interactive marker class
    const { Map3DElement, Marker3DInteractiveElement } =
        await google.maps.importLibrary('maps3d');

    
    // We will use this to place the camrea for the intial view
    const originalCamera = {
        center: { lat: 38.7946, lng: -106.5348, altitude: 5000000 },
        range: 1500,
        tilt: 0,
        heading: 0,
    };

    map = new Map3DElement({
        ...originalCamera,
        mode: 'SATELLITE', // dont include built in markers
        gestureHandling: 'GREEDY', // scroll to zoom instead of pinch
    });


    // for all cities in the database, add a marker
    citiesTable.forEach((element, index, array) => {
        map.append(addMarker(element, Map3DElement, Marker3DInteractiveElement, map))
    });

    // test city used to go here :(

    // insert the map into the iframe
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
                    <div class="flag-placeholder"><img src="/images/${entry.img}"></div>
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
            popup.style.display = 'none';
            startQuiz(entry);
        });
    };


}

//console.log("test");
initMap();

// because the map is in an iframe, it must listen for button clicks outside of the iframe. In this case, it is the start random quiz button.
window.addEventListener("message", (event) => {
    if (event.data === "runRandomPin") {
        randomPin();
    }
});
