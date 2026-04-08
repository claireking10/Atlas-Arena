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
        alert(entry.description);
    });

    return interactiveMarker;
}

async function initMap() {
    // Include the interactive marker class
    const { Map3DElement, Marker3DInteractiveElement } =
        await google.maps.importLibrary('maps3d');

    // We will use this to place the camrea for the intial view but also to fly around the starting point.
    const originalCamera = {
        center: { lat: 37.7749, lng: -122.4194, altitude: 4395.4952 },
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

    map.append(addMarker({name: 'Test City', description: 'Test description', posX: '40', posY: '50'}, Map3DElement, Marker3DInteractiveElement));

    document.body.append(map);

    //const newDiv = document.createElement("div");
    //newDiv.textContent = "table info: "+addMarker({name: 'Test City', description: 'Test description', posX: '40', posY: '50'}, Map3DElement, Marker3DInteractiveElement);
    //document.body.appendChild(newDiv);

    //console.log("test");
}

//console.log("test");
initMap();
// [END maps_3d_marker_click_event]