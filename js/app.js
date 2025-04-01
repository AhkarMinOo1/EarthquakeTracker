/**
 * app.js - Main application entry point
 * Initializes all modules and sets up the application
 */

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    UI.initialize();
    
    // Initialize map
    initializeMap();
    
    // Load saved settings including dark mode
    loadSavedSettings();
    
    // Initial data fetch with delay to allow DOM to fully render
    setTimeout(fetchEarthquakeData, 100);
    
    // Initialize charts after a short delay to ensure DOM is ready
    setTimeout(initializeCharts, 200);
    
    // Check URL parameters
    UI.checkUrlParameters();
    
    // Add CSS class for mobile detection
    if (state.isMobile) {
        document.body.classList.add('mobile-device');
    }
    
    // Handle theme preference changes
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    prefersDarkScheme.addEventListener("change", function(e) {
        if (!localStorage.getItem('darkMode')) {
            // Only apply if user hasn't set a preference
            if (e.matches && !state.darkMode) {
                toggleDarkMode();
            } else if (!e.matches && state.darkMode) {
                toggleDarkMode();
            }
        }
    });
    
    // Handle online/offline status
    window.addEventListener('online', function() {
        fetchEarthquakeData();
        showNotification('You are back online! Data has been refreshed.');
    });
    
    window.addEventListener('offline', function() {
        showNotification('You are offline. Some features may be unavailable.', 'warning');
    });
});

/**
 * Apply advanced filters to the earthquake data
 */
function applyAdvancedFilters() {
    const minDepth = parseFloat(UI.elements.minDepth.value) || 0;
    const maxDepth = parseFloat(UI.elements.maxDepth.value) || 1000;
    
    // Get date range if available
    let startDate = null;
    let endDate = null;
    
    if (UI.elements.dateRangePicker) {
        const dateRange = $(UI.elements.dateRangePicker).data('daterangepicker');
        if (dateRange) {
            startDate = dateRange.startDate.valueOf();
            endDate = dateRange.endDate.valueOf();
        }
    }
    
    // Update active filters in state
    state.activeFilters.minDepth = minDepth;
    state.activeFilters.maxDepth = maxDepth;
    state.activeFilters.dateRange = startDate && endDate ? [startDate, endDate] : null;
    
    // Filter the data
    const filteredData = state.earthquakeData.filter(feature => {
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
    
    // Process the filtered data
    processEarthquakeData(filteredData);
    
    // Show notification with filter summary
    const filterSummary = `Showing ${filteredData.length} earthquakes with depth ${minDepth}-${maxDepth}km${startDate ? ' in selected date range' : ''}`;
    showNotification(filterSummary);
}

/**
 * Save notification settings
 */
function saveNotifications() {
    state.notificationSettings.myanmarOnly = UI.elements.notifyMyanmarOnly.checked;
    state.notificationSettings.minMagnitude = parseFloat(UI.elements.notifyMinMag.value);
    state.notificationsEnabled = true;
    
    // Store in localStorage for persistence
    localStorage.setItem('earthquakeNotifySettings', JSON.stringify(state.notificationSettings));
    
    // Show confirmation
    showNotification("Notification settings saved!");
    UI.elements.notificationPanel.classList.add('d-none');
    
    // Request permission for notifications if needed
    if (Notification && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

/**
 * Show a notification toast
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `toast show notification-toast notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.setAttribute('aria-atomic', 'true');
    
    notification.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">${type === 'info' ? 'Information' : type === 'warning' ? 'Warning' : 'Alert'}</strong>
            <button type="button" class="btn-close" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add to document
    const toastContainer = document.getElementById('toast-container') || document.body;
    toastContainer.appendChild(notification);
    
    // Setup close button
    const closeButton = notification.querySelector('.btn-close');
    closeButton.addEventListener('click', function() {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

/**
 * Export data to CSV
 */
function exportToCSV() {
    if (!state.earthquakeData.length) {
        showNotification('No earthquake data to export', 'warning');
        return;
    }
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Time,Magnitude,Place,Latitude,Longitude,Depth\n';
    
    state.earthquakeData.forEach(feature => {
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
    
    // Show confirmation
    showNotification(`Exported ${state.earthquakeData.length} earthquakes to CSV`);
}

/**
 * Change language
 */
function changeLanguage(lang) {
    // In a real application, this would load translated strings
    console.log(`Language changed to ${lang}`);
    // For demonstration, just show a message
    showNotification(`Language changed to ${lang}`);
    
    // Store preference
    localStorage.setItem('language', lang);
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    // Toggle dark mode state
    state.darkMode = !state.darkMode;
    
    // Toggle dark mode class on body
    document.body.classList.toggle('dark-mode', state.darkMode);
    
    // Update dark mode icons
    const darkModeButton = document.getElementById('toggleDarkMode');
    const fabDarkMode = document.getElementById('fabDarkMode');
    
    if (state.darkMode) {
        if (darkModeButton) darkModeButton.innerHTML = '<i class="fas fa-sun me-1"></i> Light Mode';
        if (fabDarkMode) fabDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
        
        // Switch to dark map if not already using it
        if (!state.map.hasLayer(state.mapLayers.dark)) {
            // Remove all current layers
            Object.values(state.mapLayers).forEach(layer => {
                if (state.map.hasLayer(layer)) {
                    state.map.removeLayer(layer);
                }
            });
            // Add dark layer
            state.mapLayers.dark.addTo(state.map);
            
            // Update map layer dropdown if it exists
            const mapLayerSelect = document.getElementById('mapLayerSelect');
            if (mapLayerSelect) mapLayerSelect.value = 'dark';
        }
    } else {
        if (darkModeButton) darkModeButton.innerHTML = '<i class="fas fa-moon me-1"></i> Dark Mode';
        if (fabDarkMode) fabDarkMode.innerHTML = '<i class="fas fa-moon"></i>';
        
        // Switch to default layer if currently using dark
        if (state.map.hasLayer(state.mapLayers.dark)) {
            state.map.removeLayer(state.mapLayers.dark);
            state.mapLayers.street.addTo(state.map);
            
            // Update map layer dropdown if it exists
            const mapLayerSelect = document.getElementById('mapLayerSelect');
            if (mapLayerSelect) mapLayerSelect.value = 'street';
        }
    }
    
    // Store preference in localStorage
    localStorage.setItem('darkMode', state.darkMode ? 'true' : 'false');
    
    // Update charts for better visibility in dark mode
    if (state.magnitudeChart) state.magnitudeChart.update();
    if (state.timeChart) state.timeChart.update();
    if (window.historyChart) window.historyChart.update();
}

/**
 * Load saved settings from localStorage
 */
function loadSavedSettings() {
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true' && !state.darkMode) {
        // Enable dark mode
        toggleDarkMode();
    }
    
    // Other saved settings
    UI.loadSavedSettings();
}

// Expose functions to global scope
window.applyAdvancedFilters = applyAdvancedFilters;
window.saveNotifications = saveNotifications;
window.changeLanguage = changeLanguage;
window.exportToCSV = exportToCSV;
window.toggleDarkMode = toggleDarkMode; 