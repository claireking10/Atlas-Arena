/*
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-nocheck
// [START maps_3d_marker_click_event]

function addMarker(entry, Map3DElement, Marker3DInteractiveElement){
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

    // Specify the action to take on click.
    interactiveMarker.addEventListener('gmp-click', (event) => {
        showMapPopup(entry);
    });

    return interactiveMarker;
}

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

    const map = new Map3DElement({
        ...originalCamera,
        mode: 'SATELLITE',
        gestureHandling: 'COOPERATIVE',
    });

    
    citiesTable.forEach((element, index, array) => {
        map.append(addMarker(element, Map3DElement, Marker3DInteractiveElement))
    });

    map.append(addMarker({name: 'Test City', description: 'Indonesia\'s sprawling, sinking capital on the northwest coast of Java is one of the worlds most chaotic and captivating megacities. Home to over 30 million in its metro area, it is a city of extreme contrasts with its gleaming malls beside flooding kampung.', posX: '40', posY: '50'}, Map3DElement, Marker3DInteractiveElement));

    document.body.append(map);

    /*
    // Create popup div
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.background = 'white';
    popup.style.border = '2px solid #ccc';
    popup.style.borderRadius = '10px';
    popup.style.padding = '0';
    popup.style.display = 'none';
    popup.style.zIndex = '1000';
    popup.style.width = '350px';
    popup.style.maxWidth = '90vw';
    popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(popup);

    // Function to show popup
    window.showMapPopup = (entry) => {
        popup.innerHTML = `
            <div style="position:relative; padding:20px;">
                <button style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:24px; cursor:pointer; color:#666;">&times;</button>
                <div style="display:flex; flex-direction:column;">
                    <div style="display:flex; align-items:center; margin-bottom:15px;">
                        <div id="flag-container" style="width:80px; height:50px; background:#f0f0f0; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; font-size:12px; color:#999; margin-right:15px;"></div>
                        <h3 style="margin:0; font-size:20px;">${entry.name}</h3>
                    </div>
                    <p style="margin:0; line-height:1.4; text-align:left;">${entry.description}</p>
                </div>
                <div style="text-align:center; margin-top:20px;">
                    <button id="start-quiz" style="padding:8px 16px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer; font-size:14px;">Start Quiz</button>
                </div>
            </div>
        `;
        popup.style.display = 'block';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';

        // Add event listeners
        const closeBtn = popup.querySelector('button');
        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        const startBtn = popup.querySelector('#start-quiz');
        startBtn.addEventListener('click', () => {
            alert('Starting quiz for ' + entry.name);
        });
    };
*/

    //const newDiv = document.createElement("div");
    //newDiv.textContent = "table info: "+addMarker({name: 'Test City', description: 'Test description', posX: '40', posY: '50'}, Map3DElement, Marker3DInteractiveElement);
    //document.body.appendChild(newDiv);

    //console.log("test");
}

//console.log("test");
initMap();
// [END maps_3d_marker_click_event]