// Global variables
let map, markers = [], markerClusterGroup, heatmapLayer;
let earthquakeData = [];
let magnitudeChart, timeChart;
let darkMode = false;
let notificationsEnabled = false;
let notificationSettings = {
    myanmarOnly: true,
    minMagnitude: 4.5
};
let mapLayers = {};

// Myanmar approximate bounding box
const myanmarBounds = {
    north: 28.5,
    south: 9.5,
    east: 101.0,
    west: 92.0
};

// DOM elements
const elements = {
    timeRange: document.getElementById('timeRange'),
    magnitude: document.getElementById('magnitude'),
    refreshBtn: document.getElementById('refreshBtn'),
    totalQuakes: document.getElementById('totalQuakes'),
    myanmarQuakes: document.getElementById('myanmarQuakes'),
    largestMag: document.getElementById('largestMag'),
    quakeList: document.getElementById('quakeList'),
    quakeSearch: document.getElementById('quakeSearch'),
    sortQuakes: document.getElementById('sortQuakes'),
    toggleAdvFilters: document.getElementById('toggleAdvFilters'),
    advancedFilters: document.getElementById('advancedFilters'),
    minDepth: document.getElementById('minDepth'),
    maxDepth: document.getElementById('maxDepth'),
    dateRangePicker: document.getElementById('dateRangePicker'),
    applyFilters: document.getElementById('applyFilters'),
    toggleHeatmap: document.getElementById('toggleHeatmap'),
    toggleFullscreen: document.getElementById('toggleFullscreen'),
    mapLayerSelect: document.getElementById('mapLayerSelect'),
    notifyBtn: document.getElementById('notifyBtn'),
    notificationPanel: document.getElementById('notificationPanel'),
    closeNotifications: document.getElementById('closeNotifications'),
    notifyMyanmarOnly: document.getElementById('notifyMyanmarOnly'),
    notifyMinMag: document.getElementById('notifyMinMag'),
    notifyMinMagValue: document.getElementById('notifyMinMagValue'),
    saveNotificationSettings: document.getElementById('saveNotificationSettings'),
    notificationList: document.getElementById('notificationList'),
    historyBtn: document.getElementById('historyBtn'),
    historyModal: document.getElementById('historyModal'),
    historyDateRange: document.getElementById('historyDateRange'),
    historyMinMag: document.getElementById('historyMinMag'),
    fetchHistoryBtn: document.getElementById('fetchHistoryBtn'),
    historyTableBody: document.getElementById('historyTableBody'),
    detailPanel: document.getElementById('detailPanel'),
    closeDetails: document.getElementById('closeDetails'),
    detailContent: document.getElementById('detailContent'),
    nearbyQuakes: document.getElementById('nearbyQuakes'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    avgMagnitude: document.getElementById('avgMagnitude'),
    avgDepth: document.getElementById('avgDepth'),
    activeArea: document.getElementById('activeArea'),
    weekCount: document.getElementById('weekCount'),
    populationImpact: document.getElementById('populationImpact'),
    infrastructureImpact: document.getElementById('infrastructureImpact'),
    historicalComparison: document.getElementById('historicalComparison'),
    recentSignificant: document.getElementById('recentSignificant'),
    significantDetails: document.getElementById('significantDetails'),
    languageSelect: document.getElementById('languageSelect'),
    toggleStats: document.getElementById('toggleStats')
};

// Initialize map
function initializeMap() {
    // Create the map centered on Myanmar
    map = L.map('map', {
        zoomControl: false,  // We'll add zoom control in a better position for mobile
        tap: true,  // Enable tap for mobile
        bounceAtZoomLimits: false  // Prevent bounce effect at zoom limits
    }).setView([21.9162, 95.9560], 6);
    
    // Add zoom control to top-right
    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    
    // Define map layers with retina support
    mapLayers = {
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
    mapLayers.street.addTo(map);
    
    // Setup cluster group for markers
    markerClusterGroup = L.markerClusterGroup({
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
        }
    });
    map.addLayer(markerClusterGroup);
    
    // Initialize heatmap layer
    heatmapLayer = L.heatLayer([], {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {0.4: '#1a9850', 0.5: '#91cf60', 0.6: '#d9ef8b', 0.7: '#fee08b', 0.8: '#fc8d59', 1.0: '#d73027'}
    });
    
    // Add legend
    addLegendToMap();
    
    // Load Myanmar boundary
    loadMyanmarBoundary();
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

// Load Myanmar boundary
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
                }).addTo(map);
            }
        })
        .catch(error => console.error('Error loading Myanmar boundary:', error));
}

// Helper Functions
function isInMyanmarRegion(lat, lng) {
    return (
        lat >= myanmarBounds.south &&
        lat <= myanmarBounds.north &&
        lng >= myanmarBounds.west &&
        lng <= myanmarBounds.east
    );
}

function getColor(magnitude) {
    if (magnitude < 2) return '#1a9850'; // Green
    if (magnitude < 3) return '#91cf60'; // Light green
    if (magnitude < 4) return '#d9ef8b'; // Yellow-green
    if (magnitude < 5) return '#fee08b'; // Yellow
    if (magnitude < 6) return '#fc8d59'; // Orange
    return '#d73027'; // Red
}

function getSeverityClass(magnitude) {
    if (magnitude < 3) return 'severity-low';
    if (magnitude < 4.5) return 'severity-moderate';
    if (magnitude < 6) return 'severity-high';
    if (magnitude < 7) return 'severity-severe';
    return 'severity-extreme';
}

function getSize(magnitude) {
    return Math.max(magnitude * 5, 8);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    initializeMap();
    
    // Initialize date range picker
    if (elements.dateRangePicker) {
        $(elements.dateRangePicker).daterangepicker({
            startDate: moment().subtract(7, 'days'),
            endDate: moment(),
            maxDate: moment(),
            locale: {
                format: 'YYYY-MM-DD'
            }
        });
    }
    
    if (elements.historyDateRange) {
        $(elements.historyDateRange).daterangepicker({
            startDate: moment().subtract(30, 'days'),
            endDate: moment(),
            maxDate: moment(),
            locale: {
                format: 'YYYY-MM-DD'
            }
        });
    }
    
    // Initialize notification range input
    if (elements.notifyMinMag) {
        elements.notifyMinMag.addEventListener('input', function() {
            elements.notifyMinMagValue.textContent = this.value;
        });
    }
    
    // UI Event Listeners
    setupEventListeners();
    
    // Initial data fetch
    fetchEarthquakeData();
    
    // Initialize charts
    initializeCharts();
});

// Setup UI event listeners
function setupEventListeners() {
    // Main data filters
    elements.timeRange.addEventListener('change', fetchEarthquakeData);
    elements.magnitude.addEventListener('change', fetchEarthquakeData);
    elements.refreshBtn.addEventListener('click', fetchEarthquakeData);
    
    // Search and sort
    if (elements.quakeSearch) {
        elements.quakeSearch.addEventListener('input', filterQuakeList);
    }
    
    if (elements.sortQuakes) {
        elements.sortQuakes.addEventListener('change', sortQuakeList);
    }
    
    // Advanced filters toggle
    if (elements.toggleAdvFilters && elements.advancedFilters) {
        elements.toggleAdvFilters.addEventListener('click', function() {
            elements.advancedFilters.classList.toggle('d-none');
        });
    }
    
    // Map fullscreen toggle
    if (elements.toggleFullscreen) {
        elements.toggleFullscreen.addEventListener('click', function() {
            document.getElementById('map').classList.toggle('fullscreen');
            if (document.getElementById('map').classList.contains('fullscreen')) {
                this.textContent = 'Exit Fullscreen';
            } else {
                this.textContent = 'Fullscreen Map';
            }
            setTimeout(() => map.invalidateSize(), 300);
        });
    }
    
    // Apply advanced filters
    if (elements.applyFilters) {
        elements.applyFilters.addEventListener('click', applyAdvancedFilters);
    }
    
    // Toggle heatmap
    if (elements.toggleHeatmap) {
        elements.toggleHeatmap.addEventListener('click', toggleHeatmap);
    }
    
    // Map layer selector
    if (elements.mapLayerSelect) {
        elements.mapLayerSelect.addEventListener('change', function() {
            const selectedLayer = this.value;
            
            // Remove all layers
            Object.values(mapLayers).forEach(layer => {
                if (map.hasLayer(layer)) map.removeLayer(layer);
            });
            
            // Add selected layer
            if (mapLayers[selectedLayer]) {
                mapLayers[selectedLayer].addTo(map);
                
                // Toggle dark mode based on map
                if (selectedLayer === 'dark') {
                    document.body.classList.add('dark-mode');
                    darkMode = true;
                } else if (darkMode) {
                    document.body.classList.remove('dark-mode');
                    darkMode = false;
                }
            }
        });
    }

    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            map.invalidateSize();
            adjustUIForOrientation();
        }, 200);
    });

    // Handle resize events
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            map.invalidateSize();
            adjustUIForOrientation();
        }, 250);
    });

    // Add touch event handlers for mobile
    if ('ontouchstart' in window) {
        setupTouchHandlers();
    }

    // Handle back button for modals and panels on mobile
    window.addEventListener('popstate', handleBackButton);
}

// Adjust UI based on orientation
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

    // Adjust chart sizes
    if (magnitudeChart) magnitudeChart.resize();
    if (timeChart) timeChart.resize();
    if (window.historyChart) window.historyChart.resize();
}

// Setup touch handlers for mobile
function setupTouchHandlers() {
    // Double tap to zoom
    let lastTap = 0;
    map.on('click', function(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            map.setView(e.latlng, map.getZoom() + 1);
        }
        lastTap = currentTime;
    });

    // Improve touch handling for markers
    markerClusterGroup.on('click', function(e) {
        if (e.layer instanceof L.Marker) {
            const pos = e.layer.getLatLng();
            map.setView(pos, Math.max(map.getZoom(), 10));
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

// Handle back button for modals and panels
function handleBackButton(event) {
    if (elements.detailPanel && !elements.detailPanel.classList.contains('d-none')) {
        elements.detailPanel.classList.add('d-none');
        event.preventDefault();
    }
    if (elements.historyModal && elements.historyModal.style.display === 'block') {
        hideHistoryModal();
        event.preventDefault();
    }
    if (elements.notificationPanel && !elements.notificationPanel.classList.contains('d-none')) {
        elements.notificationPanel.classList.add('d-none');
        event.preventDefault();
    }
}

// Initialize charts for statistics
function initializeCharts() {
    // Magnitude distribution chart
    const magCtx = document.getElementById('magnitudeChart');
    if (magCtx) {
        magnitudeChart = new Chart(magCtx, {
            type: 'bar',
            data: {
                labels: ['<2', '2-3', '3-4', '4-5', '5-6', '6+'],
                datasets: [{
                    label: 'Earthquakes by Magnitude',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#1a9850', '#91cf60', '#d9ef8b', 
                        '#fee08b', '#fc8d59', '#d73027'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Time distribution chart
    const timeCtx = document.getElementById('timeChart');
    if (timeCtx) {
        timeChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Earthquakes by Date',
                    data: [],
                    borderColor: '#007bff',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Make charts responsive
    const resizeCharts = () => {
        if (magnitudeChart) magnitudeChart.resize();
        if (timeChart) timeChart.resize();
    };

    // Observe container size changes
    if (window.ResizeObserver) {
        const chartContainers = document.querySelectorAll('.chart-container');
        const resizeObserver = new ResizeObserver(resizeCharts);
        chartContainers.forEach(container => resizeObserver.observe(container));
    }

    // Update chart options for better mobile display
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: window.innerWidth < 576 ? 6 : 12
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    if (magnitudeChart) magnitudeChart.options = { ...magnitudeChart.options, ...chartOptions };
    if (timeChart) timeChart.options = { ...timeChart.options, ...chartOptions };
}

// Fetch and display earthquake data
async function fetchEarthquakeData() {
    // Clear existing markers
    if (markerClusterGroup) {
        markerClusterGroup.clearLayers();
    }
    markers = [];
    
    // Show loading overlay
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove('d-none');
    }
    
    // Clear quake list
    elements.quakeList.innerHTML = '';
    
    // Get selected values
    const timeRange = elements.timeRange.value;
    const magnitude = elements.magnitude.value;
    
    // Set up URL
    let url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/';
    
    if (magnitude === 'all') {
        url += 'all_';
    } else if (magnitude === 'significant') {
        url += 'significant_';
    } else {
        url += `${magnitude}_`;
    }
    
    url += `${timeRange}.geojson`;
    
    try {
        // Show loading state
        document.body.style.cursor = 'wait';
        elements.refreshBtn.disabled = true;
        elements.refreshBtn.textContent = 'Loading...';
        
        // Fetch the data
        const response = await fetch(url);
        const data = await response.json();
        
        // Store earthquake data for filtering later
        earthquakeData = data.features;
        
        processEarthquakeData(earthquakeData);
        
    } catch (error) {
        console.error('Error fetching earthquake data:', error);
        alert('Failed to fetch earthquake data. Please try again.');
    } finally {
        // Reset loading state
        document.body.style.cursor = 'default';
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.textContent = 'Refresh Data';
        
        // Hide loading overlay
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('d-none');
        }
    }
}

// Process and display earthquake data
function processEarthquakeData(features) {
    // Clear existing heatmap data
    const heatmapData = [];
    
    // Process the data
    let myanmarCount = 0;
    let largestMagnitude = 0;
    let totalDepth = 0;
    let avgMag = 0;
    let significantQuakes = [];
    let locationCounts = {};
    
    // For time chart
    const dateGroups = {};
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let quakesThisWeek = 0;
    
    // Magnitude distribution counts
    const magCounts = [0, 0, 0, 0, 0, 0]; // <2, 2-3, 3-4, 4-5, 5-6, 6+
    
    // Sort features by time (newest first)
    features.sort((a, b) => new Date(b.properties.time) - new Date(a.properties.time));
    
    features.forEach(feature => {
        const { mag, place, time, url, title } = feature.properties;
        const [longitude, latitude, depth] = feature.geometry.coordinates;
        
        // Update largest magnitude
        if (mag > largestMagnitude) {
            largestMagnitude = mag;
        }
        
        // Add to total depth for average calculation
        totalDepth += depth;
        avgMag += mag;
        
        // Add to magnitude distribution counts
        if (mag < 2) magCounts[0]++;
        else if (mag < 3) magCounts[1]++;
        else if (mag < 4) magCounts[2]++;
        else if (mag < 5) magCounts[3]++;
        else if (mag < 6) magCounts[4]++;
        else magCounts[5]++;
        
        // Group by date for time chart
        const quakeDate = new Date(time).toLocaleDateString();
        if (!dateGroups[quakeDate]) {
            dateGroups[quakeDate] = 0;
        }
        dateGroups[quakeDate]++;
        
        // Check if within last week
        if (new Date(time) > oneWeekAgo) {
            quakesThisWeek++;
        }
        
        // Check if in Myanmar region
        const inMyanmar = isInMyanmarRegion(latitude, longitude);
        if (inMyanmar) {
            myanmarCount++;
        }
        
        // Count locations for "most active" metric
        const locationKey = place.split(",").pop().trim();
        if (!locationCounts[locationKey]) {
            locationCounts[locationKey] = 0;
        }
        locationCounts[locationKey]++;
        
        // Check if significant earthquake
        if (mag >= 5.0 || (inMyanmar && mag >= 4.0)) {
            significantQuakes.push({
                magnitude: mag,
                place,
                time,
                latitude,
                longitude,
                depth,
                url
            });
        }
        
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
        
        // Add to heatmap data (weight by magnitude)
        heatmapData.push([latitude, longitude, Math.max(mag * 0.5, 0.5)]);
        
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
        if (inMyanmar) {
            marker.setZIndexOffset(1000);
        }
        
        // Add to marker cluster group
        markerClusterGroup.addLayer(marker);
        
        // Store the marker
        markers.push(marker);
        
        // Add to list (filtered by priority)
        addToQuakeList(feature, inMyanmar, color);
    });
    
    // Update statistics
    elements.totalQuakes.textContent = features.length;
    elements.myanmarQuakes.textContent = myanmarCount;
    elements.largestMag.textContent = largestMagnitude.toFixed(1);
    
    // Update the heatmap data
    if (heatmapLayer) {
        heatmapLayer.setLatLngs(heatmapData);
    }
    
    // Update statistics tab
    updateStatistics(features.length, myanmarCount, largestMagnitude, totalDepth, avgMag, locationCounts, dateGroups, quakesThisWeek, magCounts);
    
    // Update impact assessment
    updateImpactAssessment(significantQuakes);
    
    // Check if we should show notifications
    if (notificationsEnabled) {
        checkForNotifications(features);
    }
}

// Filter quake list by search term
function filterQuakeList() {
    const searchTerm = elements.quakeSearch.value.toLowerCase();
    const quakeItems = elements.quakeList.getElementsByTagName('li');
    
    Array.from(quakeItems).forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Sort quake list by selected criteria
function sortQuakeList() {
    const sortBy = elements.sortQuakes.value;
    const quakeItems = Array.from(elements.quakeList.getElementsByTagName('li'));
    
    quakeItems.sort((a, b) => {
        if (sortBy === 'time') {
            // Get the date from the small tag
            const dateA = new Date(a.querySelector('small').textContent);
            const dateB = new Date(b.querySelector('small').textContent);
            return dateB - dateA; // Newest first
        } else if (sortBy === 'magnitude') {
            // Extract magnitude from the strong tag
            const magA = parseFloat(a.querySelector('strong').textContent.substring(1));
            const magB = parseFloat(b.querySelector('strong').textContent.substring(1));
            return magB - magA; // Highest first
        } else if (sortBy === 'depth') {
            // Not directly available in the list, would need to store as data attribute
            return 0;
        }
    });
    
    // Remove all items
    while (elements.quakeList.firstChild) {
        elements.quakeList.removeChild(elements.quakeList.firstChild);
    }
    
    // Add sorted items back
    quakeItems.forEach(item => {
        elements.quakeList.appendChild(item);
    });
}

// Add earthquake to the list with priority for Myanmar region
function addToQuakeList(feature, inMyanmar, color) {
    const { mag, place, time } = feature.properties;
    const [longitude, latitude, depth] = feature.geometry.coordinates;
    
    // Only add if it's in Myanmar or the list is still small
    if (inMyanmar || (elements.quakeList.children.length < 50)) {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>M${mag.toFixed(1)}</strong> - ${place}<br>
            <small>${formatDate(time)}</small>
            <div class="small text-muted">Depth: ${depth.toFixed(1)} km</div>
        `;
        
        // Add data attributes for advanced sorting
        li.dataset.magnitude = mag;
        li.dataset.time = time;
        li.dataset.depth = depth;
        
        if (inMyanmar) {
            li.style.borderLeft = `4px solid ${color}`;
            li.style.paddingLeft = '10px';
        }
        
        li.addEventListener('click', () => {
            map.setView([latitude, longitude], 10);
            // Find the corresponding marker and open its popup
            markers.forEach(marker => {
                const markerLatLng = marker.getLatLng();
                if (markerLatLng.lat === latitude && markerLatLng.lng === longitude) {
                    marker.openPopup();
                }
            });
        });
        
        elements.quakeList.appendChild(li);
    }
}

// Apply advanced filters to the earthquake data
function applyAdvancedFilters() {
    const minDepth = parseFloat(elements.minDepth.value) || 0;
    const maxDepth = parseFloat(elements.maxDepth.value) || 1000;
    
    // Get date range if available
    let startDate = null;
    let endDate = null;
    
    if (elements.dateRangePicker) {
        const dateRange = $(elements.dateRangePicker).data('daterangepicker');
        if (dateRange) {
            startDate = dateRange.startDate.valueOf();
            endDate = dateRange.endDate.valueOf();
        }
    }
    
    // Filter the data
    const filteredData = earthquakeData.filter(feature => {
        const depth = feature.geometry.coordinates[2];
        const time = feature.properties.time;
        
        // Check depth
        if (depth < minDepth || depth > maxDepth) {
            return false;
        }
        
        // Check date range if specified
        if (startDate && endDate) {
            if (time < startDate || time > endDate) {
                return false;
            }
        }
        
        return true;
    });
    
    // Clear and redisplay with filtered data
    processEarthquakeData(filteredData);
}

// Toggle heatmap display
function toggleHeatmap() {
    if (map.hasLayer(heatmapLayer)) {
        map.removeLayer(heatmapLayer);
        elements.toggleHeatmap.textContent = 'Show Heatmap';
    } else {
        map.addLayer(heatmapLayer);
        elements.toggleHeatmap.textContent = 'Hide Heatmap';
    }
}

// Update statistics tab with calculated metrics
function updateStatistics(total, myanmarCount, largestMag, totalDepth, totalMag, locationCounts, dateGroups, weekCount, magCounts) {
    // Calculate averages
    const avgDepth = totalDepth / total;
    const avgMag = totalMag / total;
    
    // Find most active area
    let mostActiveArea = 'None';
    let maxCount = 0;
    
    for (const [location, count] of Object.entries(locationCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostActiveArea = location;
        }
    }
    
    // Update statistics elements
    if (elements.avgMagnitude) elements.avgMagnitude.textContent = avgMag.toFixed(2);
    if (elements.avgDepth) elements.avgDepth.textContent = avgDepth.toFixed(2);
    if (elements.activeArea) elements.activeArea.textContent = mostActiveArea;
    if (elements.weekCount) elements.weekCount.textContent = weekCount;
    
    // Update charts if available
    updateCharts(dateGroups, magCounts);
}

// Update the charts with new data
function updateCharts(dateGroups, magCounts) {
    // Update magnitude chart
    if (magnitudeChart) {
        magnitudeChart.data.datasets[0].data = magCounts;
        magnitudeChart.update();
    }
    
    // Update time chart
    if (timeChart) {
        // Convert dateGroups object to sorted arrays for chart
        const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(a) - new Date(b));
        const counts = sortedDates.map(date => dateGroups[date]);
        
        // Update chart
        timeChart.data.labels = sortedDates;
        timeChart.data.datasets[0].data = counts;
        timeChart.update();
    }
}

// Update the impact assessment tab
function updateImpactAssessment(significantQuakes) {
    if (significantQuakes.length === 0) {
        if (elements.recentSignificant) elements.recentSignificant.classList.add('d-none');
        if (elements.populationImpact) elements.populationImpact.textContent = 'No significant events to analyze';
        if (elements.infrastructureImpact) elements.infrastructureImpact.textContent = 'No significant events to analyze';
        if (elements.historicalComparison) elements.historicalComparison.textContent = 'No data available';
        return;
    }
    
    // Sort by magnitude (highest first)
    significantQuakes.sort((a, b) => b.magnitude - a.magnitude);
    
    // Show the most significant earthquake
    const mostSignificant = significantQuakes[0];
    
    if (elements.recentSignificant) {
        elements.recentSignificant.classList.remove('d-none');
        if (elements.significantDetails) {
            elements.significantDetails.innerHTML = `
                <strong>M${mostSignificant.magnitude.toFixed(1)}</strong> earthquake near ${mostSignificant.place}<br>
                Time: ${formatDate(mostSignificant.time)}<br>
                Depth: ${mostSignificant.depth.toFixed(2)} km<br>
                <button class="btn btn-sm btn-primary mt-2" onclick="map.setView([${mostSignificant.latitude}, ${mostSignificant.longitude}], 10)">View on map</button>
            `;
        }
    }
    
    // Simple impact assessments (in a real app, this would use more sophisticated models)
    if (elements.populationImpact) {
        elements.populationImpact.innerHTML = getPopulationImpactText(mostSignificant);
    }
    
    if (elements.infrastructureImpact) {
        elements.infrastructureImpact.innerHTML = getInfrastructureImpactText(mostSignificant);
    }
    
    if (elements.historicalComparison) {
        elements.historicalComparison.innerHTML = getHistoricalComparisonText(mostSignificant);
    }
}

// Template functions for impact assessment
function getPopulationImpactText(quake) {
    const inMyanmar = isInMyanmarRegion(quake.latitude, quake.longitude);
    
    if (quake.magnitude >= 6.0) {
        return `
            <div class="alert alert-danger">
                Potentially severe impact. Populations within 50-100km could experience strong to severe shaking.
                ${inMyanmar ? 'Myanmar regions near the epicenter should be on high alert.' : ''}
            </div>
        `;
    } else if (quake.magnitude >= 5.0) {
        return `
            <div class="alert alert-warning">
                Moderate impact possible. Populations within 20-50km could experience moderate shaking.
                ${inMyanmar ? 'Myanmar communities near the epicenter may experience effects.' : ''}
            </div>
        `;
    } else {
        return `
            <div class="alert alert-info">
                Limited impact expected. The earthquake may have been felt by nearby populations but likely caused minimal disruption.
            </div>
        `;
    }
}

function getInfrastructureImpactText(quake) {
    if (quake.magnitude >= 6.0) {
        return `
            <div class="alert alert-danger">
                At this magnitude, infrastructure damage is likely, particularly to older or poorly constructed buildings. 
                Roads, bridges, and utility lines may be affected. Emergency services should be on alert.
            </div>
        `;
    } else if (quake.magnitude >= 5.0) {
        return `
            <div class="alert alert-warning">
                Some structural damage possible to vulnerable buildings. Minor impacts to infrastructure may occur.
                Precautionary checks recommended for critical facilities.
            </div>
        `;
    } else {
        return `
            <div class="alert alert-info">
                Minimal infrastructure impact expected. Some superficial damage might occur in very close proximity to the epicenter.
            </div>
        `;
    }
}

function getHistoricalComparisonText(quake) {
    // In a real app, this would compare with a database of historical earthquakes
    // For demonstration purposes, using simplified text based on magnitude
    
    if (quake.magnitude >= 6.5) {
        return `
            <div class="alert alert-danger">
                This is a significant earthquake for this region. Historical context: Myanmar experienced similar magnitude
                earthquakes in 2016 (M6.8) and 2011 (M6.9) that caused damage to pagodas and buildings.
            </div>
        `;
    } else if (quake.magnitude >= 5.5) {
        return `
            <div class="alert alert-warning">
                Moderate to strong earthquake. Myanmar typically experiences several earthquakes of this magnitude each year.
                The 2012 M5.8 earthquake near Shwebo caused some structural damage.
            </div>
        `;
    } else {
        return `
            <div class="alert alert-info">
                This magnitude is relatively common in the Myanmar region. These earthquakes occur regularly due to the
                active tectonic setting along the Sagaing Fault and India-Eurasia plate boundary.
            </div>
        `;
    }
}

// Show a detailed panel for a specific earthquake
function showDetailPanel(lat, lng, dataString) {
    const data = JSON.parse(decodeURIComponent(dataString));
    
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
            const nearbyQuakes = earthquakeData.filter(feature => {
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
                        map.setView([qLat, qLng], 10);
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
    
    // Close button functionality
    if (elements.closeDetails) {
        elements.closeDetails.onclick = function() {
            elements.detailPanel.classList.add('d-none');
        };
    }
}

// Calculate distance between two points in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Notification system
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    
    if (notificationsEnabled) {
        elements.notifyBtn.textContent = 'Disable Notifications';
        elements.notifyBtn.classList.remove('btn-warning');
        elements.notifyBtn.classList.add('btn-danger');
        elements.notificationPanel.classList.remove('d-none');
        
        // Request permission for notifications if needed
        if (Notification && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    } else {
        elements.notifyBtn.textContent = 'Enable Notifications';
        elements.notifyBtn.classList.remove('btn-danger');
        elements.notifyBtn.classList.add('btn-warning');
        elements.notificationPanel.classList.add('d-none');
    }
}

// Save notification settings
function saveNotifications() {
    notificationSettings.myanmarOnly = elements.notifyMyanmarOnly.checked;
    notificationSettings.minMagnitude = parseFloat(elements.notifyMinMag.value);
    
    // Store in localStorage for persistence
    localStorage.setItem('earthquakeNotifySettings', JSON.stringify(notificationSettings));
    
    // Show confirmation
    alert("Notification settings saved!");
    elements.notificationPanel.classList.add('d-none');
}

// Check for earthquakes that meet notification criteria
function checkForNotifications(features) {
    // Get earthquakes from the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentQuakes = features.filter(feature => {
        const time = new Date(feature.properties.time);
        return time > oneHourAgo;
    });
    
    // Check each recent quake against notification criteria
    recentQuakes.forEach(feature => {
        const { mag, place, time } = feature.properties;
        const [longitude, latitude] = feature.geometry.coordinates;
        const inMyanmar = isInMyanmarRegion(latitude, longitude);
        
        // Skip if not meeting criteria
        if (notificationSettings.myanmarOnly && !inMyanmar) return;
        if (mag < notificationSettings.minMagnitude) return;
        
        // Check if we've already notified about this (using localStorage)
        const notifiedQuakes = JSON.parse(localStorage.getItem('notifiedQuakes') || '[]');
        const quakeId = feature.id || `${latitude}-${longitude}-${time}`;
        
        if (notifiedQuakes.includes(quakeId)) return;
        
        // Send notification
        sendEarthquakeNotification(mag, place, time, latitude, longitude);
        
        // Add to notified list
        notifiedQuakes.push(quakeId);
        if (notifiedQuakes.length > 50) notifiedQuakes.shift(); // Keep the list manageable
        localStorage.setItem('notifiedQuakes', JSON.stringify(notifiedQuakes));
        
        // Add to notification history panel
        addNotificationToHistory(mag, place, time);
    });
}

// Send browser notification
function sendEarthquakeNotification(mag, place, time, lat, lng) {
    if (!Notification) return;
    
    if (Notification.permission === "granted") {
        const notification = new Notification("Earthquake Alert", {
            body: `M${mag.toFixed(1)} earthquake near ${place} at ${formatDate(time)}`,
            icon: "https://earthquake.usgs.gov/theme/images/usgs-logo.png"
        });
        
        notification.onclick = function() {
            window.focus();
            map.setView([lat, lng], 10);
        };
    }
}

// Add notification to history panel
function addNotificationToHistory(mag, place, time) {
    if (!elements.notificationList) return;
    
    const item = document.createElement('div');
    item.className = 'notification-item unread';
    item.innerHTML = `
        <strong>M${mag.toFixed(1)}</strong> earthquake near ${place}<br>
        <small>${formatDate(time)}</small>
    `;
    
    // Add at the top
    if (elements.notificationList.firstChild) {
        elements.notificationList.insertBefore(item, elements.notificationList.firstChild);
    } else {
        elements.notificationList.appendChild(item);
    }
    
    // Remove old notifications if we have too many
    const notifications = elements.notificationList.getElementsByClassName('notification-item');
    if (notifications.length > 10) {
        elements.notificationList.removeChild(notifications[notifications.length - 1]);
    }
}

// Historical earthquake data functions
function showHistoryModal() {
    if (elements.historyModal) {
        elements.historyModal.style.display = 'block';
    }
}

function hideHistoryModal() {
    if (elements.historyModal) {
        elements.historyModal.style.display = 'none';
    }
}

// Fetch historical earthquake data
async function fetchHistoricalData() {
    if (!elements.historyDateRange || !elements.historyMinMag) return;
    
    // Get date range and magnitude filter
    const dateRange = $(elements.historyDateRange).data('daterangepicker');
    const minMag = parseFloat(elements.historyMinMag.value) || 4.0;
    
    if (!dateRange) return;
    
    const startDate = dateRange.startDate.format('YYYY-MM-DD');
    const endDate = dateRange.endDate.format('YYYY-MM-DD');
    
    // Show loading
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove('d-none');
    }
    
    try {
        // Build USGS API query
        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate}&endtime=${endDate}&minmagnitude=${minMag}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Display historical data
        displayHistoricalData(data.features);
        
    } catch (error) {
        console.error('Error fetching historical data:', error);
        alert('Failed to fetch historical earthquake data. Please try again.');
    } finally {
        // Hide loading
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('d-none');
        }
    }
}

// Display historical earthquake data
function displayHistoricalData(features) {
    if (!elements.historyTableBody) return;
    
    // Clear existing data
    elements.historyTableBody.innerHTML = '';
    
    // Sort by time (newest first)
    features.sort((a, b) => new Date(b.properties.time) - new Date(a.properties.time));
    
    // Group by date for the chart
    const dateGroups = {};
    
    // Fill table
    features.forEach(feature => {
        const { mag, place, time } = feature.properties;
        const [longitude, latitude, depth] = feature.geometry.coordinates;
        const inMyanmar = isInMyanmarRegion(latitude, longitude);
        
        // Add to date groups for chart
        const quakeDate = new Date(time).toISOString().split('T')[0];
        if (!dateGroups[quakeDate]) {
            dateGroups[quakeDate] = 0;
        }
        dateGroups[quakeDate]++;
        
        // Create table row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(time)}</td>
            <td>M${mag.toFixed(1)}</td>
            <td>${place}</td>
            <td>${depth.toFixed(1)} km</td>
            <td>
                <button class="btn btn-sm btn-primary view-on-map" 
                    data-lat="${latitude}" 
                    data-lng="${longitude}" 
                    data-mag="${mag}"
                    data-place="${place}"
                    data-time="${time}"
                    data-depth="${depth}">
                    View
                </button>
            </td>
        `;
        
        // Highlight Myanmar earthquakes
        if (inMyanmar) {
            tr.classList.add('table-warning');
        }
        
        // Add row to table
        elements.historyTableBody.appendChild(tr);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-on-map').forEach(button => {
        button.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const mag = parseFloat(this.dataset.mag);
            const place = this.dataset.place;
            const time = parseInt(this.dataset.time);
            const depth = parseFloat(this.dataset.depth);
            
            // Close modal
            hideHistoryModal();
            
            // Center map on earthquake
            map.setView([lat, lng], 10);
            
            // Show temporary marker
            const tempMarker = L.marker([lat, lng]).addTo(map);
            tempMarker.bindPopup(`
                <strong>Historical Earthquake</strong><br>
                <strong>Magnitude:</strong> ${mag}<br>
                <strong>Location:</strong> ${place}<br>
                <strong>Time:</strong> ${formatDate(time)}<br>
                <strong>Depth:</strong> ${depth.toFixed(2)} km
            `).openPopup();
            
            // Remove marker after 30 seconds
            setTimeout(() => {
                map.removeLayer(tempMarker);
            }, 30000);
        });
    });
    
    // Update chart
    updateHistoryChart(dateGroups);
}

// Update the history chart with new data
function updateHistoryChart(dateGroups) {
    const historyChartEl = document.getElementById('historyChart');
    if (!historyChartEl) return;
    
    // Sort dates
    const sortedDates = Object.keys(dateGroups).sort();
    const counts = sortedDates.map(date => dateGroups[date]);
    
    // Create chart if it doesn't exist, otherwise update
    if (!window.historyChart) {
        window.historyChart = new Chart(historyChartEl, {
            type: 'bar',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Earthquakes by Date',
                    data: counts,
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Earthquakes'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    } else {
        window.historyChart.data.labels = sortedDates;
        window.historyChart.data.datasets[0].data = counts;
        window.historyChart.update();
    }
}

// Load settings from local storage
function loadSavedSettings() {
    // Load notification settings
    const savedNotifySettings = localStorage.getItem('earthquakeNotifySettings');
    if (savedNotifySettings) {
        try {
            const settings = JSON.parse(savedNotifySettings);
            notificationSettings = { ...notificationSettings, ...settings };
            
            // Update UI
            if (elements.notifyMyanmarOnly) {
                elements.notifyMyanmarOnly.checked = notificationSettings.myanmarOnly;
            }
            
            if (elements.notifyMinMag) {
                elements.notifyMinMag.value = notificationSettings.minMagnitude;
                elements.notifyMinMagValue.textContent = notificationSettings.minMagnitude;
            }
        } catch (e) {
            console.error('Error loading notification settings:', e);
        }
    }
    
    // Load other settings like map layer preference, dark mode, etc.
    const mapLayer = localStorage.getItem('earthquakeMapLayer');
    if (mapLayer && elements.mapLayerSelect) {
        elements.mapLayerSelect.value = mapLayer;
        // Trigger change event to apply the layer
        const event = new Event('change');
        elements.mapLayerSelect.dispatchEvent(event);
    }
}

// Save selected map layer
function saveMapLayerPreference() {
    if (elements.mapLayerSelect) {
        localStorage.setItem('earthquakeMapLayer', elements.mapLayerSelect.value);
    }
}

// Language support
function changeLanguage(lang) {
    // In a real application, this would load translated strings
    console.log(`Language changed to ${lang}`);
    // For demonstration, just show a message
    alert(`Language would change to ${lang} in a complete implementation.`);
}

// Export data to CSV
function exportToCSV() {
    if (!earthquakeData.length) {
        alert('No earthquake data to export');
        return;
    }
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Time,Magnitude,Place,Latitude,Longitude,Depth\n';
    
    earthquakeData.forEach(feature => {
        const { mag, place, time } = feature.properties;
        const [longitude, latitude, depth] = feature.geometry.coordinates;
        const formattedTime = new Date(time).toISOString();
        
        csvContent += `${formattedTime},${mag},"${place}",${latitude},${longitude},${depth}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `myanmar_earthquakes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
}

// Share current view
function shareCurrentView() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const shareUrl = `${window.location.origin}${window.location.pathname}?lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}&zoom=${zoom}`;
    
    // Check if Web Share API is available
    if (navigator.share) {
        navigator.share({
            title: 'Myanmar Earthquake Tracker',
            text: 'Check out this earthquake data for Myanmar',
            url: shareUrl
        })
        .catch(error => {
            console.error('Error sharing:', error);
            fallbackShare(shareUrl);
        });
    } else {
        fallbackShare(shareUrl);
    }
}

// Fallback share method (copy to clipboard)
function fallbackShare(url) {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Link copied to clipboard: ' + url);
}

// Check URL parameters on load
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat'));
    const lng = parseFloat(urlParams.get('lng'));
    const zoom = parseInt(urlParams.get('zoom'));
    
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
        map.setView([lat, lng], zoom);
    }
}

// Setup additional event listeners
function setupAdditionalEventListeners() {
    // Notification buttons
    if (elements.notifyBtn) {
        elements.notifyBtn.addEventListener('click', toggleNotifications);
    }
    
    if (elements.closeNotifications) {
        elements.closeNotifications.addEventListener('click', function() {
            elements.notificationPanel.classList.add('d-none');
        });
    }
    
    if (elements.saveNotificationSettings) {
        elements.saveNotificationSettings.addEventListener('click', saveNotifications);
    }
    
    // History modal
    if (elements.historyBtn) {
        elements.historyBtn.addEventListener('click', showHistoryModal);
    }
    
    if (elements.historyModal) {
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', hideHistoryModal);
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === elements.historyModal) {
                hideHistoryModal();
            }
        });
    }
    
    if (elements.fetchHistoryBtn) {
        elements.fetchHistoryBtn.addEventListener('click', fetchHistoricalData);
    }
    
    // Map layer selection
    if (elements.mapLayerSelect) {
        elements.mapLayerSelect.addEventListener('change', saveMapLayerPreference);
    }
    
    // Language selection
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', function() {
            changeLanguage(this.value);
        });
    }
    
    // Footer links
    document.getElementById('shareLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        shareCurrentView();
    });
    
    document.getElementById('aboutLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Myanmar Earthquake Tracker\n\nThis application displays real-time earthquake data with a focus on Myanmar, using the USGS Earthquake API. Created to help monitor and raise awareness about seismic activity in the region.');
    });
    
    document.getElementById('apiDocsLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.open('https://earthquake.usgs.gov/fdsnws/event/1/', '_blank');
    });
    
    document.getElementById('feedbackLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        prompt('Please enter your feedback:', '');
    });
    
    // Add export button to stats tab
    const statsTab = document.getElementById('statsTab');
    if (statsTab) {
        const exportButton = document.createElement('button');
        exportButton.className = 'btn btn-sm btn-outline-secondary mt-3';
        exportButton.textContent = 'Export Data (CSV)';
        exportButton.addEventListener('click', exportToCSV);
        statsTab.appendChild(exportButton);
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Refresh data: Alt+R
        if (e.altKey && e.key === 'r') {
            fetchEarthquakeData();
        }
        
        // Toggle fullscreen: Alt+F
        if (e.altKey && e.key === 'f') {
            document.getElementById('toggleFullscreen').click();
        }
        
        // Toggle heatmap: Alt+H
        if (e.altKey && e.key === 'h' && elements.toggleHeatmap) {
            elements.toggleHeatmap.click();
        }
    });
}

// Call additional setup functions when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up extra event listeners
    setupAdditionalEventListeners();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Load saved settings
    loadSavedSettings();
    
    // Check URL parameters
    checkUrlParameters();
});

// Expose functions to window for HTML event handlers
window.showDetailPanel = showDetailPanel; 