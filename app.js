// Global variables
let map, markers = [], markerClusterGroup, heatmapLayer;
let earthquakeData = [];
let filteredEarthquakeData = [];
let darkMode = false; // Keep this as false to start in light mode
let mapLayers = {}; // Make mapLayers available throughout this file
let selectedCountry = 'myanmar'; // Default country filter

// Country bounding boxes (approximate)
const countryBounds = {
    all: {
        north: 90,
        south: -90,
        east: 180,
        west: -180
    },
    myanmar: {
        north: 28.5,
        south: 9.5,
        east: 101.0,
        west: 92.0
    },
    thailand: {
        north: 20.5,
        south: 5.5,
        east: 106.0,
        west: 97.0
    },
    china: {
        north: 53.5,
        south: 15.0,
        east: 135.0,
        west: 73.0
    },
    india: {
        north: 37.0,
        south: 6.0,
        east: 97.5,
        west: 68.0
    },
    bangladesh: {
        north: 26.6,
        south: 20.5,
        east: 92.7,
        west: 88.0
    },
    laos: {
        north: 22.5,
        south: 13.9,
        east: 107.8,
        west: 100.0
    }
};

// DOM elements
const elements = {
    timeRange: document.getElementById('timeRange'),
    magnitude: document.getElementById('magnitude'),
    countryFilter: document.getElementById('countryFilter'),
    totalQuakes: document.getElementById('totalQuakes'),
    filteredQuakes: document.getElementById('filteredQuakes'),
    largestMag: document.getElementById('largestMag'),
    quakeList: document.getElementById('quakeList'),
    detailPanel: document.getElementById('detailPanel'),
    closeDetails: document.getElementById('closeDetails'),
    detailContent: document.getElementById('detailContent'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    lastUpdate: document.getElementById('lastUpdate'),
    languageSelect: document.getElementById('languageSelector')
};

// Initialize map
function initializeMap() {
    // Create the map centered on Myanmar
    map = L.map('map', {
        zoomControl: true,
        tap: true
    }).setView([21.9162, 95.9560], 6);
    
    // Define map layers with retina support
    mapLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        })
    };
    
    // Add the default street layer
    mapLayers.street.addTo(map);
    
    // Setup cluster group for markers with improved settings for visibility at all zoom levels
    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: function(zoom) {
            // Use smaller cluster radius at lower zoom levels to show more markers
            if (zoom <= 4) return 30; // Very zoomed out
            if (zoom <= 6) return 50; // World view
            if (zoom <= 8) return 70; // Regional view
            return 80; // Default for closer zooms
        },
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 12, // Disable clustering at high zoom levels
        zoomToBoundsOnClick: true,
        singleMarkerMode: false, // Don't show individual markers as clusters
        iconCreateFunction: function(cluster) {
            // Custom cluster icon based on number of markers
            const count = cluster.getChildCount();
            let size = 40; // Base size
            let className = 'marker-cluster-';
            
            if (count < 10) {
                className += 'small';
            } else if (count < 100) {
                className += 'medium';
                size = 50;
            } else {
                className += 'large';
                size = 60;
            }
            
            return L.divIcon({
                html: '<div><span>' + count + '</span></div>',
                className: className,
                iconSize: L.point(size, size)
            });
        }
    });
    
    map.addLayer(markerClusterGroup);
    
    // Make sure the Leaflet.heat plugin is loaded
    if (typeof L.heatLayer === 'function') {
        // Initialize heatmap layer with dynamic radius based on zoom level
        heatmapLayer = L.heatLayer([], {
            radius: getHeatmapRadius,  // Dynamic radius function instead of fixed value
            blur: 15,
            maxZoom: 18,  // Increased max zoom to allow higher detail
            minOpacity: 0.4,  // Ensure minimum visibility
            gradient: {0.4: '#1a9850', 0.5: '#91cf60', 0.6: '#d9ef8b', 0.7: '#fee08b', 0.8: '#fc8d59', 1.0: '#d73027'}
        });
        
        // Add event listener to update heatmap when zoom changes
        map.on('zoomend', function() {
            if (map.hasLayer(heatmapLayer)) {
                updateHeatmap(filteredEarthquakeData);
            }
        });
    } else {
        console.error('Leaflet.heat plugin not loaded. Heatmap functionality will not be available.');
        // Disable the heatmap button if the plugin is not available
        if (elements.toggleHeatmap) {
            elements.toggleHeatmap.disabled = true;
            elements.toggleHeatmap.title = 'Heatmap not available';
        }
    }
    
    // Add legend
    addLegendToMap();
    
    // Load selected country boundary
    loadCountryBoundary(selectedCountry);
    
    // Export map and layers to window for access from other scripts
    window.appMap = map;
    window.appMapLayers = mapLayers;
}

// Initialize charts if needed
function initializeCharts() {
    // Check if there are chart containers on the page
    const magnitudeChartContainer = document.getElementById('magnitudeChart');
    const depthChartContainer = document.getElementById('depthChart');
    const timeChartContainer = document.getElementById('timeChart');
    
    // If charts are not in the simplified interface, skip initialization
    if (!magnitudeChartContainer && !depthChartContainer && !timeChartContainer) {
        console.log("Charts not found in this interface, skipping chart initialization");
        return;
    }
    
    console.log("Initializing charts with earthquake data");
    
    // If we have earthquake data, we can initialize charts
    if (filteredEarthquakeData && filteredEarthquakeData.length > 0) {
        try {
            // If the Charts library is available (ensure it's loaded in the HTML)
            if (typeof Chart !== 'undefined') {
                // Initialize magnitude distribution chart
                if (magnitudeChartContainer) {
                    createMagnitudeChart(magnitudeChartContainer, filteredEarthquakeData);
                }
                
                // Initialize depth distribution chart
                if (depthChartContainer) {
                    createDepthChart(depthChartContainer, filteredEarthquakeData);
                }
                
                // Initialize time series chart
                if (timeChartContainer) {
                    createTimeChart(timeChartContainer, filteredEarthquakeData);
                }
            } else {
                console.warn("Chart.js library not loaded. Charts will not be available.");
            }
        } catch (error) {
            console.error("Error initializing charts:", error);
        }
    } else {
        console.warn("No earthquake data available for charts");
    }
}

// Add legend to map
function addLegendToMap() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
        
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
    legend.addTo(map);
}

// Load country boundary
function loadCountryBoundary(country) {
    // Clear previous boundaries
    if (window.countryBoundaryLayer) {
        map.removeLayer(window.countryBoundaryLayer);
    }
    
    // If "all" is selected, don't show any specific boundary
    if (country === 'all') {
        return;
    }

    // Center map on selected country
    const bounds = countryBounds[country];
    if (bounds) {
        map.fitBounds([
            [bounds.south, bounds.west],
            [bounds.north, bounds.east]
        ]);
    }
    
    fetch('https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson')
        .then(response => response.json())
        .then(data => {
            // Find country in the dataset
            const countryData = data.features.find(feature => {
                const name = feature.properties.ADMIN?.toLowerCase() || 
                             feature.properties.admin?.toLowerCase() ||
                             feature.properties.name?.toLowerCase();
                return name === country;
            });
            
            if (countryData) {
                // Add country boundary
                window.countryBoundaryLayer = L.geoJSON(countryData, {
                    style: {
                        color: '#0066cc',
                        weight: 2,
                        fillOpacity: 0.1
                    }
                }).addTo(map);
            } else {
                console.warn(`Boundary data for ${country} not found`);
                
                // Draw a rectangle based on bounding box as fallback
                const bounds = countryBounds[country];
                if (bounds) {
                    window.countryBoundaryLayer = L.rectangle([
                        [bounds.south, bounds.west],
                        [bounds.north, bounds.east]
                    ], {
                        color: '#0066cc',
                        weight: 2,
                        fillOpacity: 0.1
                    }).addTo(map);
                }
            }
        })
        .catch(error => console.error(`Error loading ${country} boundary:`, error));
}

// Helper Functions
function isInRegion(lat, lng, region) {
    const bounds = countryBounds[region];
    if (!bounds) return false;
    
    return lat <= bounds.north && 
           lat >= bounds.south && 
           lng <= bounds.east && 
           lng >= bounds.west;
}

function getColor(magnitude) {
    if (magnitude >= 6) return '#d73027';
    if (magnitude >= 5) return '#fc8d59';
    if (magnitude >= 4) return '#fee08b';
    if (magnitude >= 3) return '#d9ef8b';
    if (magnitude >= 2) return '#91cf60';
    return '#1a9850';
}

function getSeverityClass(magnitude) {
    if (magnitude >= 6) return 'severity-extreme';
    if (magnitude >= 5) return 'severity-severe';
    if (magnitude >= 4) return 'severity-high';
    if (magnitude >= 3) return 'severity-moderate';
    return 'severity-low';
}

function getSize(magnitude) {
    return magnitude * 5;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    
    // Check if the date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();
    
    if (isToday) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `Today at ${formattedHours}:${formattedMinutes} ${ampm}`;
    }
    
    // Check if the date was yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
                      date.getMonth() === yesterday.getMonth() &&
                      date.getFullYear() === yesterday.getFullYear();
    
    if (isYesterday) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `Yesterday at ${formattedHours}:${formattedMinutes} ${ampm}`;
    }
    
    // Format date for older dates
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Setup Event Listeners
function setupEventListeners() {
    // Main data filters
    elements.timeRange.addEventListener('change', fetchEarthquakeData);
    elements.magnitude.addEventListener('change', fetchEarthquakeData);
    
    // Country filter
    if (elements.countryFilter) {
        elements.countryFilter.addEventListener('change', function() {
            selectedCountry = this.value;
            loadCountryBoundary(selectedCountry);
            
            // If we already have data, just re-filter and re-render it
            if (earthquakeData && earthquakeData.length > 0) {
                filterEarthquakeData();
                renderEarthquakeData();
            } else {
                // Otherwise fetch new data
                fetchEarthquakeData();
            }
        });
    }
    
    // Detail panel close button
    if (elements.closeDetails) {
        elements.closeDetails.addEventListener('click', function() {
            if (elements.detailPanel) {
                elements.detailPanel.classList.add('hidden');
            }
        });
    }
    
    // Language selector
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', function() {
            changeLanguage(this.value);
        });
    }
}

// Helper function for fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
        ...options,
        signal: controller.signal
    });
    
    clearTimeout(id);
    return response;
}

// Update loading message to provide feedback to users
function updateLoadingMessage(message) {
    const loadingText = document.querySelector('#loadingOverlay p');
    if (loadingText) {
        loadingText.textContent = message;
    }
}

// Fetch earthquake data
async function fetchEarthquakeData() {
    try {
        // Show loading overlay
        elements.loadingOverlay.classList.remove('d-none');
        updateLoadingMessage("Preparing to fetch earthquake data...");
        
        // Get selected time range
        const timeRange = elements.timeRange.value;
        
        // Get selected magnitude
        const magnitude = elements.magnitude.value;
        
        // Build URL - Using the correct USGS API format
        let url;
        if (magnitude === 'all') {
            url = `${API_CONFIG.primary.baseUrl}${timeRange}_all.geojson`;
        } else if (magnitude === 'significant') {
            url = `${API_CONFIG.primary.baseUrl}${timeRange}_significant.geojson`;
        } else {
            // The correct format for USGS API is "timerange_magnitude.geojson"
            url = `${API_CONFIG.primary.baseUrl}${timeRange}_${magnitude}.geojson`;
        }
        
        console.log("Fetching earthquake data from:", url);
        updateLoadingMessage("Connecting to USGS data server...");
        
        try {
            // Try primary API first with a 10 second timeout
            const response = await fetchWithTimeout(url, {}, 10000);
            
            if (response.ok) {
                updateLoadingMessage("Downloading earthquake data...");
                const data = await response.json();
                updateLoadingMessage("Processing earthquake data...");
                processEarthquakeData(data.features);
                console.log("Successfully fetched data from primary API");
                return;
            }
            
            console.warn("Primary API failed, trying fallback...");
            updateLoadingMessage("Primary source failed, trying alternative source...");
            
            // Try direct URL to known USGS endpoints
            const knownEndpoints = {
                "day_2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
                "week_2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
                "month_2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson",
                "day_4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
                "week_4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson",
                "month_4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson",
                "day_all": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
                "week_all": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
                "month_all": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
                "day_significant": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson",
                "week_significant": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
                "month_significant": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson"
            };
            
            const key = `${timeRange}_${magnitude}`;
            const directUrl = knownEndpoints[key] || url;
            
            // Try direct URL with a 10 second timeout
            const directResponse = await fetchWithTimeout(directUrl, {}, 10000);
            
            if (directResponse.ok) {
                updateLoadingMessage("Downloading earthquake data from alternative source...");
                const data = await directResponse.json();
                updateLoadingMessage("Processing earthquake data...");
                processEarthquakeData(data.features);
                console.log("Successfully fetched data from direct API endpoint");
                return;
            }
            
            console.warn("Direct API endpoint failed, using local dummy data...");
            updateLoadingMessage("Online sources unavailable, loading local data...");
            
            // If all API attempts fail, use local dummy data with a shorter timeout
            const dummyDataResponse = await fetchWithTimeout('dummy-data.json', {}, 5000);
            
            if (dummyDataResponse.ok) {
                updateLoadingMessage("Processing local earthquake data...");
                const dummyData = await dummyDataResponse.json();
                processEarthquakeData(dummyData.features);
                console.log("Using local dummy data as last resort");
                return;
            }
            
            throw new Error("All data sources failed");
            
        } catch (error) {
            // Handle timeout errors explicitly
            if (error.name === 'AbortError') {
                updateLoadingMessage("Connection timed out. Trying backup data...");
                console.error("Request timed out:", error);
                throw new Error("Request timed out. Please check your connection and try again.");
            } else {
                updateLoadingMessage("Error connecting to data sources...");
                console.error("Error in fetch operations:", error);
                throw error;
            }
        }
    } catch (error) {
        console.error('Error fetching earthquake data:', error);
        updateLoadingMessage("Failed to fetch data. Trying emergency backup...");
        alert('Failed to fetch earthquake data. Please check your connection and try again.');
        
        // Final fallback: try to load dummy data directly even if previous attempts failed
        try {
            const dummyDataResponse = await fetchWithTimeout('dummy-data.json', {}, 5000);
            const dummyData = await dummyDataResponse.json();
            updateLoadingMessage("Processing emergency backup data...");
            processEarthquakeData(dummyData.features);
            console.log("Using local dummy data after error");
        } catch (finalError) {
            updateLoadingMessage("All data sources failed. Please try again later.");
            console.error('Failed to load fallback data:', finalError);
            alert('Could not load any earthquake data. Please check your connection and try again.');
        }
    } finally {
        // Always hide loading overlay, regardless of success or failure
        elements.loadingOverlay.classList.add('d-none');
        
        // Update last update time
        const now = new Date();
        elements.lastUpdate.textContent = `Last update: ${now.toLocaleTimeString()}`;
    }
}

// Process earthquake data
function processEarthquakeData(features) {
    // Store previous data for comparison
    const previousData = [...earthquakeData];
    
    // Clear existing data
    earthquakeData = [];
    
    // Process each feature
    features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        const lng = coords[0];
        const lat = coords[1];
        const depth = coords[2];
        const properties = feature.properties;
        const magnitude = properties.mag;
        const place = properties.place;
        const time = properties.time;
        const id = feature.id || properties.code; // Use id or code as identifier
        
        // Check if in selected country region
        const inSelectedRegion = isInRegion(lat, lng, selectedCountry);
        
        // Store earthquake data
        earthquakeData.push({
            id,
            lat,
            lng,
            depth,
            magnitude,
            place,
            time,
            inSelectedRegion
        });
    });
    
    // Check for new earthquakes to notify
    if (previousData.length > 0) {
        const newEarthquakes = earthquakeData.filter(quake => 
            !previousData.some(prevQuake => prevQuake.id === quake.id)
        );
        
        // Notify about new significant earthquakes in the selected region
        const significantNewEarthquakes = newEarthquakes.filter(quake => 
            quake.magnitude >= 4.5 && 
            (quake.inSelectedRegion || selectedCountry === 'all')
        );
        
        // Send notifications if any significant new earthquakes
        if (significantNewEarthquakes.length > 0 && typeof window.NotificationManager !== 'undefined') {
            // Limit to 3 notifications to avoid spam
            significantNewEarthquakes.slice(0, 3).forEach(quake => {
                window.NotificationManager.notifyNewEarthquake(quake);
            });
        }
    }
    
    // Filter and render the data
    filterEarthquakeData();
    renderEarthquakeData();
}

// Filter earthquake data based on country selection
function filterEarthquakeData() {
    if (selectedCountry === 'all') {
        // If 'all' is selected, use all earthquake data
        filteredEarthquakeData = [...earthquakeData];
    } else {
        // Otherwise, filter by selected country
        filteredEarthquakeData = earthquakeData.filter(quake => 
            quake.inSelectedRegion || // Include earthquakes in the selected region
            selectedCountry === 'all' // Or include all if no country filter is applied
        );
    }
}

// Render earthquake data on the map and in the list
function renderEarthquakeData() {
    // Clear existing markers
    markerClusterGroup.clearLayers();
    elements.quakeList.innerHTML = '';
    
    // Reset counts
    let total = earthquakeData.length;
    let filteredCount = filteredEarthquakeData.length;
    let largestMag = 0;
    
    // Create array for batch processing
    const markers = [];
    
    // Process each feature
    filteredEarthquakeData.forEach(quake => {
        const lat = quake.lat;
        const lng = quake.lng;
        const depth = quake.depth;
        const magnitude = quake.magnitude;
        const place = quake.place;
        const time = quake.time;
        const id = quake.id;
        
        // Find largest magnitude
        if (magnitude > largestMag) largestMag = magnitude;
        
        // Create marker
        const size = getSize(magnitude);
        const color = getColor(magnitude);
        const severityClass = getSeverityClass(magnitude);
        
        // Scale marker size based on magnitude to make them more visible at all zoom levels
        // Increase minimum size to ensure visibility when zoomed out
        const scaledSize = Math.max(size, 12);
        
        const markerHtml = `
            <div class="earthquake-marker ${severityClass}" style="width:${scaledSize}px;height:${scaledSize}px;">
                ${magnitude.toFixed(1)}
            </div>
        `;
        
        const icon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [scaledSize, scaledSize],
            iconAnchor: [scaledSize/2, scaledSize/2]
        });
        
        const marker = L.marker([lat, lng], {
            icon: icon,
            title: `${magnitude.toFixed(1)} - ${place}`
        });
        
        // Create feature object for popup
        const feature = {
            id: id,
            properties: {
                mag: magnitude,
                place: place,
                time: time
            },
            geometry: {
                coordinates: [lng, lat, depth]
            }
        };
        
        // Add popup with info
        const popupContent = `
            <div class="popup-content">
                <h5 class="mb-1">Magnitude ${magnitude.toFixed(1)}</h5>
                <p class="mb-1">${place}</p>
                <p class="mb-1">Depth: ${depth.toFixed(1)} km</p>
                <p class="mb-0">Time: ${formatDate(time)}</p>
                <button class="btn btn-sm btn-primary mt-2 details-btn" data-earthquake-id="${id}" data-lat="${lat}" data-lng="${lng}">
                    View Details
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add event listener for details button - improved to use specific popup instead of global selector
        marker.on('popupopen', function(e) {
            const popup = e.popup;
            const container = popup.getElement();
            const detailsBtn = container.querySelector('.details-btn');
            
            if (detailsBtn) {
                detailsBtn.addEventListener('click', function() {
                    const lat = parseFloat(this.getAttribute('data-lat'));
                    const lng = parseFloat(this.getAttribute('data-lng'));
                    // Use the actual earthquake data object instead of passing via attribute
                    const earthquakeData = JSON.stringify(feature);
                    showDetailPanel(lat, lng, earthquakeData);
                    popup.close(); // Close popup after showing details
                });
            }
        });
        
        // Add to markers array for batch processing
        markers.push(marker);
        
        // Add to list
        addToQuakeList(feature, quake.inSelectedRegion, color);
    });
    
    // Add all markers to the cluster group at once for better performance
    markerClusterGroup.addLayers(markers);
    
    // Update earthquake counts
    elements.totalQuakes.textContent = total;
    elements.filteredQuakes.textContent = filteredCount;
    elements.largestMag.textContent = largestMag.toFixed(1);
    
    // Update heatmap data
    updateHeatmap(filteredEarthquakeData);
    
    // Initialize or update charts if needed
    setTimeout(initializeCharts, 200);
}

// Add earthquake to list
function addToQuakeList(feature, inSelectedRegion, color) {
    const properties = feature.properties;
    const magnitude = properties.mag;
    const place = properties.place;
    const time = properties.time;
    const coords = feature.geometry.coordinates;
    const depth = coords[2];
    
    const li = document.createElement('li');
    li.className = inSelectedRegion ? 'filtered-region' : '';
    li.dataset.id = feature.id || properties.code; // Add data-id attribute for UI.js
    li.innerHTML = `
        <span class="magnitude" style="background-color: ${color}">${magnitude.toFixed(1)}</span>
        <div class="location">
            <div class="place">${place}</div>
            <div class="time">${formatDate(time)}</div>
        </div>
    `;
    
    // Add click event to show details
    li.addEventListener('click', function() {
        const lat = coords[1];
        const lng = coords[0];
        showDetailPanel(lat, lng, JSON.stringify(feature));
    });
    
    elements.quakeList.appendChild(li);
}

// Get dynamic heatmap radius based on zoom level
function getHeatmapRadius(zoom) {
    // Scale radius inversely with zoom level
    if (!zoom) {
        zoom = map ? map.getZoom() : 6;  // Default zoom if not provided
    }
    
    // Adjust these values to control how the heatmap radius scales with zoom
    if (zoom <= 4) return 40;      // Very zoomed out (world view)
    if (zoom <= 6) return 30;      // Regional view
    if (zoom <= 8) return 25;      // Country view
    if (zoom <= 10) return 20;     // State/province view
    if (zoom <= 12) return 18;     // City view
    if (zoom <= 14) return 15;     // Neighborhood view
    return 12;                     // Street view
}

// Update heatmap data
function updateHeatmap(data) {
    // Skip if heatmap functionality is not available
    if (!heatmapLayer) return;
    
    const heatData = data.map(quake => {
        // Use exponential weighting to make stronger earthquakes more visible
        // Adjust intensity based on magnitude for better visualization
        const intensity = Math.pow(quake.magnitude, 1.8) / 8;
        
        // Add to heatmap data
        return [quake.lat, quake.lng, intensity];
    });
    
    // Update the heatmap data
    heatmapLayer.setLatLngs(heatData);
    
    // Force redraw with current zoom level
    const currentZoom = map.getZoom();
    heatmapLayer.setOptions({
        radius: getHeatmapRadius(currentZoom)
    });
}

// Show detail panel
function showDetailPanel(lat, lng, dataString) {
    try {
        const data = JSON.parse(decodeURIComponent(dataString));
        const properties = data.properties;
        const geometry = data.geometry;
        
        const magnitude = properties.mag;
        const place = properties.place;
        const time = properties.time;
        const depth = geometry.coordinates[2];
        
        // Center map on earthquake
        map.setView([lat, lng], 10);
        
        // Show detail panel - Fix: Use 'hidden' class instead of 'd-none'
        elements.detailPanel.classList.remove('hidden');
        
        // Color for severity
        const color = getColor(magnitude);
        const severityClass = getSeverityClass(magnitude);
        
        // Format location
        let locationParts = place.split(' of ');
        let distanceInfo = '';
        let locationName = place;
        
        if (locationParts.length > 1) {
            distanceInfo = locationParts[0];
            locationName = locationParts[1];
        }
        
        // Format content
        const content = `
            <div class="detail-header ${severityClass}">
                <h3>Magnitude ${magnitude.toFixed(1)} Earthquake</h3>
                <p>${formatDate(time)}</p>
            </div>
            <div class="detail-body">
                <p><strong>Location:</strong> ${place}</p>
                <p><strong>Depth:</strong> ${depth.toFixed(1)} km</p>
                <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                
                <div class="mt-3">
                    <p class="mb-1"><strong>Impact Assessment:</strong></p>
                    <p>This earthquake was ${magnitude < 4 ? 'likely not felt by most people.' : 
                        magnitude < 5 ? 'likely felt by many people but caused minimal damage.' :
                        magnitude < 6 ? 'felt by everyone in the affected area and may have caused light damage to buildings.' :
                        'strongly felt and may have caused significant damage in the affected region.'}</p>
                </div>
                
                <div class="mt-3">
                    <p class="mb-1"><strong>Safety Information:</strong></p>
                    <ul>
                        <li>Drop, Cover, and Hold On during an earthquake</li>
                        <li>Stay away from buildings, power lines, and trees</li>
                        <li>Move to higher ground if near the coast</li>
                    </ul>
                </div>
            </div>
        `;
        
        elements.detailContent.innerHTML = content;
        
    } catch (error) {
        console.error('Error displaying detail panel:', error);
    }
}

// Change language
function changeLanguage(lang) {
    console.log(`Language changed to: ${lang}`);
    // In a real app, we would load language resources and update the UI
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize map
        initializeMap();
        
        // Setup event listeners
        setupEventListeners();
        
        // Fetch initial earthquake data
        fetchEarthquakeData();
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('There was an error initializing the application. Please try reloading the page.');
    }
}); 