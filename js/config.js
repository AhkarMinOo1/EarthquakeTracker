/**
 * config.js - Configuration parameters and global variables
 */

// Global variables
const Config = {
    // API URLs
    apis: {
        usgsBase: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/',
        usgsQuery: 'https://earthquake.usgs.gov/fdsnws/event/1/query'
    },
    
    // Map settings
    map: {
        center: [21.9162, 95.9560], // Myanmar center coordinates
        zoom: 6,
        minZoom: 3,
        maxZoom: 18,
        bounds: {
            north: 28.5,
            south: 9.5,
            east: 101.0,
            west: 92.0
        }
    },
    
    // Default filter values
    defaults: {
        timeRange: 'day',
        magnitude: '2.5',
        minDepth: 0,
        maxDepth: 1000
    },
    
    // Chart colors
    colors: {
        magnitudes: ['#1a9850', '#91cf60', '#d9ef8b', '#fee08b', '#fc8d59', '#d73027'],
        severity: {
            low: '#28a745',
            moderate: '#ffc107',
            high: '#fd7e14',
            severe: '#dc3545',
            extreme: '#7400b8'
        },
        primary: '#007bff',
        secondary: '#6c757d'
    },
    
    // Notification defaults
    notifications: {
        enabled: false,
        myanmarOnly: true,
        minMagnitude: 4.5
    }
};

// Global state
let state = {
    map: null,
    markers: [],
    markerClusterGroup: null,
    heatmapLayer: null,
    earthquakeData: [],
    magnitudeChart: null,
    timeChart: null,
    darkMode: false,
    notificationsEnabled: false,
    notificationSettings: { ...Config.notifications },
    mapLayers: {},
    isMobile: window.innerWidth <= 768,
    activeFilters: {
        timeRange: Config.defaults.timeRange,
        magnitude: Config.defaults.magnitude,
        minDepth: Config.defaults.minDepth,
        maxDepth: Config.defaults.maxDepth,
        dateRange: null
    }
};

/**
 * Check if coordinates are within Myanmar region
 */
function isInMyanmarRegion(lat, lng) {
    return (
        lat >= Config.map.bounds.south &&
        lat <= Config.map.bounds.north &&
        lng >= Config.map.bounds.west &&
        lng <= Config.map.bounds.east
    );
}

/**
 * Get color based on earthquake magnitude
 */
function getColor(magnitude) {
    if (magnitude < 2) return Config.colors.magnitudes[0];
    if (magnitude < 3) return Config.colors.magnitudes[1];
    if (magnitude < 4) return Config.colors.magnitudes[2];
    if (magnitude < 5) return Config.colors.magnitudes[3];
    if (magnitude < 6) return Config.colors.magnitudes[4];
    return Config.colors.magnitudes[5];
}

/**
 * Get severity class based on earthquake magnitude
 */
function getSeverityClass(magnitude) {
    if (magnitude < 3) return 'severity-low';
    if (magnitude < 4.5) return 'severity-moderate';
    if (magnitude < 6) return 'severity-high';
    if (magnitude < 7) return 'severity-severe';
    return 'severity-extreme';
}

/**
 * Get marker size based on magnitude
 */
function getSize(magnitude) {
    return Math.max(magnitude * 5, 8);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

/**
 * Calculate distance between two points in km
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
} 