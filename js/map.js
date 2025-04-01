/**
 * map.js - Map initialization and functions
 */

/**
 * Initialize map
 */
function initializeMap() {
    // Create the map centered on Myanmar
    state.map = L.map('map', {
        zoomControl: false,  // We'll add zoom control in a better position for mobile
        tap: true,  // Enable tap for mobile
        bounceAtZoomLimits: false  // Prevent bounce effect at zoom limits
    }).setView(Config.map.center, Config.map.zoom);
    
    // Add zoom control to top-right
    L.control.zoom({
        position: 'topright'
    }).addTo(state.map);
    
    // Define map layers with retina support
    state.mapLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            detectRetina: true
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18,
            detectRetina: true
        }),
        terrain: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            detectRetina: true
        }),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
            detectRetina: true
        })
    };
    
    // Add the default street layer
    state.mapLayers.street.addTo(state.map);
    
    // Setup cluster group for markers
    state.markerClusterGroup = L.markerClusterGroup({
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 40;
            if (count > 50) size = 60;
            else if (count > 20) size = 50;
            
            return L.divIcon({
                html: `<div class="custom-cluster-marker" style="width:${size}px;height:${size}px;">${count}</div>`,
                className: '',
                iconSize: L.point(size, size)
            });
        },
        disableClusteringAtZoom: 10, // Don't cluster at high zoom levels
        spiderfyOnMaxZoom: true,
        chunkedLoading: true, // Improves performance with many markers
        zoomToBoundsOnClick: true,
        maxClusterRadius: 60 // Larger radius for better clustering
    });
    state.map.addLayer(state.markerClusterGroup);
    
    // Initialize heatmap layer
    state.heatmapLayer = L.heatLayer([], {
        radius: 20,
        blur: 15,
        maxZoom: 17,
        max: 10,
        gradient: {
            0.1: '#66bb6a',
            0.3: '#ffd54f',
            0.5: '#ff9800',
            0.7: '#ef6c00',
            0.9: '#d84315',
            1.0: '#b71c1c'
        },
        minOpacity: 0.4
    });
    
    // Add legend
    addLegendToMap();
    
    // Load Myanmar boundary
    loadMyanmarBoundary();

    // Setup responsive map handling
    setupMapResponsiveHandling();
}

/**
 * Add legend to map
 */
function addLegendToMap() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        
        const magnitudes = [1, 2, 3, 4, 5, 6];
        let legendHtml = '<strong>Magnitude</strong><br>';
        
        magnitudes.forEach(mag => {
            const color = getColor(mag);
            legendHtml += `
                <div style="display:flex;align-items:center;margin:3px 0;">
                    <div style="background-color:${color};width:15px;height:15px;margin-right:5px;border-radius:50%;"></div>
                    ${mag}${mag === 6 ? '+' : ' - ' + (mag + 1)}
                </div>
            `;
        });
        
        div.innerHTML = legendHtml;
        return div;
    };
    legend.addTo(state.map);
}

/**
 * Load Myanmar boundary
 */
function loadMyanmarBoundary() {
    fetch('https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson')
        .then(response => response.json())
        .then(data => {
            // Find Myanmar in the dataset (ISO code MMR)
            const myanmar = data.features.find(feature => 
                feature.properties.iso_a3 === 'MMR' || 
                feature.properties.ISO_A3 === 'MMR');
            
            if (myanmar) {
                // Add Myanmar boundary
                L.geoJSON(myanmar, {
                    style: {
                        color: '#0066cc',
                        weight: 2,
                        fillOpacity: 0.1
                    }
                }).addTo(state.map);
            }
        })
        .catch(error => console.error('Error loading Myanmar boundary:', error));
}

/**
 * Set up responsive map handling
 */
function setupMapResponsiveHandling() {
    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            state.map.invalidateSize();
            adjustUIForOrientation();
        }, 200);
    });

    // Handle resize events
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            state.map.invalidateSize();
            adjustUIForOrientation();
            state.isMobile = window.innerWidth <= 768;
        }, 250);
    });

    // Setup touch handlers for mobile
    if ('ontouchstart' in window) {
        setupTouchHandlers();
    }
}

/**
 * Adjust UI based on orientation
 */
function adjustUIForOrientation() {
    const isMobile = window.innerWidth <= 768;
    const isLandscape = window.innerWidth > window.innerHeight;

    if (isMobile) {
        if (isLandscape) {
            // Optimize for landscape
            document.getElementById('map').style.height = '70vh';
            document.getElementById('sidebar').style.height = '30vh';
        } else {
            // Optimize for portrait
            document.getElementById('map').style.height = '60vh';
            document.getElementById('sidebar').style.height = '40vh';
        }
    }

    // Adjust chart sizes if they exist
    if (state.magnitudeChart) state.magnitudeChart.resize();
    if (state.timeChart) state.timeChart.resize();
    if (window.historyChart) window.historyChart.resize();
}

/**
 * Setup touch handlers for mobile
 */
function setupTouchHandlers() {
    // Double tap to zoom
    let lastTap = 0;
    state.map.on('click', function(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            state.map.setView(e.latlng, state.map.getZoom() + 1);
        }
        lastTap = currentTime;
    });

    // Improve touch handling for markers
    state.markerClusterGroup.on('click', function(e) {
        if (e.layer instanceof L.Marker) {
            const pos = e.layer.getLatLng();
            state.map.setView(pos, Math.max(state.map.getZoom(), 10));
        }
    });

    // Add touch feedback to buttons
    document.querySelectorAll('.btn, .fab-button, .fab-item').forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.opacity = '0.7';
        });
        button.addEventListener('touchend', function() {
            this.style.opacity = '1';
        });
    });
}

/**
 * Toggle heatmap display
 */
function toggleHeatmap() {
    if (state.map.hasLayer(state.heatmapLayer)) {
        state.map.removeLayer(state.heatmapLayer);
        document.getElementById('toggleHeatmap').innerHTML = '<i class="fas fa-fire me-1"></i> Show Heatmap';
        document.getElementById('fabHeatmap')?.setAttribute('aria-pressed', 'false');
    } else {
        state.map.addLayer(state.heatmapLayer);
        document.getElementById('toggleHeatmap').innerHTML = '<i class="fas fa-fire-alt me-1"></i> Hide Heatmap';
        document.getElementById('fabHeatmap')?.setAttribute('aria-pressed', 'true');
        // Re-generate heatmap if it's empty
        if (state.earthquakeData && state.earthquakeData.length > 0) {
            updateHeatmap(state.earthquakeData);
        }
    }
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
        // Switch to dark map if not already
        if (!state.map.hasLayer(state.mapLayers.dark)) {
            // Remove all layers
            Object.values(state.mapLayers).forEach(layer => {
                if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
            });
            state.mapLayers.dark.addTo(state.map);
        }
    } else {
        document.body.classList.remove('dark-mode');
        // Switch to street map if currently on dark
        if (state.map.hasLayer(state.mapLayers.dark)) {
            state.map.removeLayer(state.mapLayers.dark);
            state.mapLayers.street.addTo(state.map);
        }
    }
}

/**
 * Toggle fullscreen map
 */
function toggleFullscreen() {
    const mapElement = document.getElementById('map');
    mapElement.classList.toggle('fullscreen');
    
    const button = document.getElementById('toggleFullscreen');
    if (mapElement.classList.contains('fullscreen')) {
        button.innerHTML = '<i class="fas fa-compress me-1"></i> Exit Fullscreen';
    } else {
        button.innerHTML = '<i class="fas fa-expand me-1"></i> Fullscreen Map';
    }
    
    // Resize map after transition
    setTimeout(() => state.map.invalidateSize(), 300);
}

/**
 * Change map layer
 */
function changeMapLayer(layerName) {
    // Remove all layers
    Object.values(state.mapLayers).forEach(layer => {
        if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
    });
    
    // Add selected layer
    if (state.mapLayers[layerName]) {
        state.mapLayers[layerName].addTo(state.map);
        
        // Update dark mode status based on layer
        if (layerName === 'dark' && !state.darkMode) {
            document.body.classList.add('dark-mode');
            state.darkMode = true;
        } else if (layerName !== 'dark' && state.darkMode) {
            document.body.classList.remove('dark-mode');
            state.darkMode = false;
        }
    }
    
    // Save preference
    localStorage.setItem('earthquakeMapLayer', layerName);
}

/**
 * Add earthquake marker to map
 */
function addEarthquakeMarker(feature) {
    const { mag, place, time, url, title } = feature.properties;
    const [longitude, latitude, depth] = feature.geometry.coordinates;
    
    // Create marker
    const size = getSize(mag);
    const color = getColor(mag);
    const severityClass = getSeverityClass(mag);
    
    const markerHtml = `<div class="earthquake-marker ${severityClass}" style="width:${size}px; height:${size}px;">${mag.toFixed(1)}</div>`;
    const icon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [size, size]
    });
    
    const marker = L.marker([latitude, longitude], { icon });
    
    // Add popup
    marker.bindPopup(`
        <strong>Magnitude:</strong> ${mag}<br>
        <strong>Location:</strong> ${place}<br>
        <strong>Time:</strong> ${formatDate(time)}<br>
        <strong>Depth:</strong> ${depth.toFixed(2)} km<br>
        <a href="${url}" target="_blank">More details</a>
        <br><button class="btn btn-sm btn-primary mt-2" onclick="showDetailPanel(${latitude}, ${longitude}, '${encodeURIComponent(JSON.stringify({
            mag, place, time, depth, url
        }))}')">Show details</button>
    `);
    
    // Highlight markers in Myanmar
    const inMyanmar = isInMyanmarRegion(latitude, longitude);
    if (inMyanmar) {
        marker.setZIndexOffset(1000);
    }
    
    // Add to marker cluster group
    state.markerClusterGroup.addLayer(marker);
    
    // Store the marker
    state.markers.push(marker);
    
    // Return information needed for the earthquake list
    return {
        marker,
        inMyanmar,
        color,
        coordinates: [latitude, longitude, depth]
    };
}

/**
 * Update heatmap with earthquake data
 */
function updateHeatmap(data) {
    // Clear existing heatmap data
    const heatmapData = [];
    
    // Add each earthquake as a heatmap point
    data.forEach(feature => {
        const { mag } = feature.properties;
        const [longitude, latitude] = feature.geometry.coordinates;
        
        // Weight by magnitude (exponential scale works better for heatmap visualization)
        // This gives more visual prominence to stronger earthquakes
        const weight = Math.pow(mag, 1.5) / 10;
        
        // Add to heatmap data with weighted intensity
        heatmapData.push([latitude, longitude, weight]);
    });
    
    // Update the heatmap data
    state.heatmapLayer.setLatLngs(heatmapData);
}

/**
 * Show detail panel for an earthquake
 */
function showDetailPanel(lat, lng, dataString) {
    const data = JSON.parse(decodeURIComponent(dataString));
    const elements = UI.elements;
    
    if (elements.detailPanel) {
        elements.detailPanel.classList.remove('d-none');
        
        if (elements.detailContent) {
            elements.detailContent.innerHTML = `
                <h5>Earthquake Details</h5>
                <div class="detail-item">
                    <strong>Magnitude:</strong> ${data.mag}
                </div>
                <div class="detail-item">
                    <strong>Location:</strong> ${data.place}
                </div>
                <div class="detail-item">
                    <strong>Time:</strong> ${formatDate(data.time)}
                </div>
                <div class="detail-item">
                    <strong>Depth:</strong> ${data.depth.toFixed(2)} km
                </div>
                <div class="detail-item mt-2">
                    <strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}
                </div>
                <div class="mt-3">
                    <a href="${data.url}" target="_blank" class="btn btn-sm btn-outline-primary">View on USGS</a>
                </div>
            `;
        }
        
        // Find nearby earthquakes
        if (elements.nearbyQuakes) {
            elements.nearbyQuakes.innerHTML = '<h6>Nearby Earthquakes</h6>';
            
            // Find earthquakes within approximately 300km
            const nearbyQuakes = state.earthquakeData.filter(feature => {
                const [qLng, qLat] = feature.geometry.coordinates;
                const distance = getDistanceFromLatLonInKm(lat, lng, qLat, qLng);
                return distance < 300 && feature.properties.mag !== data.mag; // Exclude this earthquake
            });
            
            if (nearbyQuakes.length > 0) {
                // Sort by distance
                nearbyQuakes.sort((a, b) => {
                    const [aLng, aLat] = a.geometry.coordinates;
                    const [bLng, bLat] = b.geometry.coordinates;
                    const distA = getDistanceFromLatLonInKm(lat, lng, aLat, aLng);
                    const distB = getDistanceFromLatLonInKm(lat, lng, bLat, bLng);
                    return distA - distB;
                });
                
                // Show up to 5 nearby earthquakes
                const nearbyList = document.createElement('ul');
                nearbyList.className = 'list-group';
                
                nearbyQuakes.slice(0, 5).forEach(quake => {
                    const [qLng, qLat] = quake.geometry.coordinates;
                    const distance = getDistanceFromLatLonInKm(lat, lng, qLat, qLng);
                    
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';
                    listItem.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>M${quake.properties.mag.toFixed(1)}</strong> - ${quake.properties.place}
                                <div><small>${formatDate(quake.properties.time)}</small></div>
                            </div>
                            <div class="badge bg-secondary">${distance.toFixed(0)} km</div>
                        </div>
                    `;
                    
                    listItem.addEventListener('click', () => {
                        state.map.setView([qLat, qLng], 10);
                        elements.detailPanel.classList.add('d-none');
                    });
                    
                    nearbyList.appendChild(listItem);
                });
                
                elements.nearbyQuakes.appendChild(nearbyList);
            } else {
                elements.nearbyQuakes.innerHTML += '<p>No nearby earthquakes found.</p>';
            }
        }
    }
}

// Expose global functions
window.showDetailPanel = showDetailPanel; 