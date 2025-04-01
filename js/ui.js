/**
 * UI Controller for Myanmar Earthquake Tracker
 * Handles UI interactions, dark mode toggle, and filter panel
 */

// Initialize UI Controller when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        // Main UI elements
        body: document.body,
        map: document.getElementById('map'),
        filterBtn: document.getElementById('filterBtn'),
        filterPanel: document.getElementById('filterPanel'),
        closeFilterBtn: document.getElementById('closeFilterPanel'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        
        // Filters
        countryFilter: document.getElementById('countryFilter'),
        timeRange: document.getElementById('timeRange'),
        magnitude: document.getElementById('magnitude'),
        applyFilters: document.getElementById('applyFilters'),
        
        // Details panel
        detailPanel: document.getElementById('detailPanel'),
        closeDetails: document.getElementById('closeDetails'),
        
        // Loading overlay
        loadingOverlay: document.getElementById('loadingOverlay')
    };
    
    // Check for dark mode preference
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let darkMode = localStorage.getItem('darkMode') === 'true' || prefersDarkMode;
    
    // Initialize UI
    initUI();
    
    /**
     * Initialize the UI
     */
    function initUI() {
        // Set initial dark mode
        updateDarkMode();
        
        // Add event listeners
        addEventListeners();
        
        // Check URL parameters for filter settings
        applyUrlParams();
    }
    
    /**
     * Add event listeners to UI elements
     */
    function addEventListeners() {
        // Filter toggle
        if (elements.filterBtn) {
            elements.filterBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event from bubbling to document
                toggleFilterPanel();
            });
            
            // Initialize aria attributes
            elements.filterBtn.setAttribute('aria-expanded', 'false');
            elements.filterBtn.setAttribute('aria-controls', 'filterPanel');
        }
        
        // Dark mode toggle
        if (elements.darkModeToggle) {
            elements.darkModeToggle.addEventListener('click', toggleDarkMode);
        }
        
        // Apply filters button
        if (elements.applyFilters) {
            elements.applyFilters.addEventListener('click', function(e) {
                e.preventDefault();
                applyFilters();
                // Make sure to remove active state from filter button
                if (elements.filterBtn) {
                    elements.filterBtn.classList.remove('active');
                }
            });
        }
        
        // Close details panel
        if (elements.closeDetails) {
            elements.closeDetails.addEventListener('click', function() {
                hideDetailPanel();
            });
        }
        
        // Filter change events for direct apply
        if (elements.countryFilter) {
            elements.countryFilter.addEventListener('change', function() {
                // Allow a slight delay before changing to avoid excessive redraws
                if (window.filterTimeout) clearTimeout(window.filterTimeout);
                window.filterTimeout = setTimeout(applyFilters, 300);
            });
        }
        
        // Add click event for earthquake list items
        document.addEventListener('click', function(e) {
            if (e.target.closest('.earthquake-list li')) {
                const listItem = e.target.closest('.earthquake-list li');
                if (listItem.dataset.id) {
                    if (typeof window.UI.showEarthquakeDetails === 'function') {
                        window.UI.showEarthquakeDetails(listItem.dataset.id);
                    } else if (typeof showEarthquakeDetails === 'function') {
                        showEarthquakeDetails(listItem.dataset.id);
                    } else {
                        // Fallback if neither function exists
                        const earthquake = findEarthquakeById(listItem.dataset.id);
                        if (earthquake && typeof showDetailPanel === 'function') {
                            showDetailPanel(
                                earthquake.lat, 
                                earthquake.lng, 
                                JSON.stringify({
                                    id: earthquake.id,
                                    properties: {
                                        mag: earthquake.magnitude,
                                        place: earthquake.place,
                                        time: earthquake.time
                                    },
                                    geometry: {
                                        coordinates: [earthquake.lng, earthquake.lat, earthquake.depth]
                                    }
                                })
                            );
                        }
                    }
                }
            }
        });
        
        // Close panels when clicking outside
        document.addEventListener('click', function(e) {
            // If filter panel is open and click is outside filter panel and filter button
            if (elements.filterPanel && 
                !elements.filterPanel.classList.contains('hidden') && 
                !elements.filterPanel.contains(e.target) && 
                e.target !== elements.filterBtn && 
                !elements.filterBtn.contains(e.target)) {
                
                toggleFilterPanel(); // Close the panel properly
            }
        });
        
        // Handle escape key to close panels
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // Close filter panel if open
                if (elements.filterPanel && !elements.filterPanel.classList.contains('hidden')) {
                    toggleFilterPanel();
                    // Return focus to filter button
                    if (elements.filterBtn) {
                        elements.filterBtn.focus();
                    }
                }
                
                // Close detail panel if open
                if (elements.detailPanel && !elements.detailPanel.classList.contains('hidden')) {
                    hideDetailPanel();
                }
            }
        });
        
        // Close filter panel button
        if (elements.closeFilterBtn) {
            elements.closeFilterBtn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleFilterPanel();
            });
        }
    }
    
    /**
     * Toggle filter panel visibility
     */
    function toggleFilterPanel() {
        if (elements.filterPanel) {
            // Toggle the hidden class
            elements.filterPanel.classList.toggle('hidden');
            
            // Toggle active state on filter button
            if (elements.filterBtn) {
                elements.filterBtn.classList.toggle('active');
                
                // Update aria attributes for accessibility
                const isExpanded = !elements.filterPanel.classList.contains('hidden');
                elements.filterBtn.setAttribute('aria-expanded', isExpanded);
                
                // Set focus to first input if panel is opened
                if (isExpanded && elements.countryFilter) {
                    setTimeout(() => {
                        elements.countryFilter.focus();
                    }, 100);
                }
            }
        }
    }
    
    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        darkMode = !darkMode;
        updateDarkMode();
        
        // Save preference
        localStorage.setItem('darkMode', darkMode);
        
        // Trigger map style update if needed
        if (typeof updateMapStyle === 'function') {
            updateMapStyle();
        }
    }
    
    /**
     * Update UI for dark mode
     */
    function updateDarkMode() {
        if (darkMode) {
            elements.body.classList.add('dark-mode');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            elements.darkModeToggle.title = 'Switch to Light Mode';
        } else {
            elements.body.classList.remove('dark-mode');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            elements.darkModeToggle.title = 'Switch to Dark Mode';
        }
    }
    
    /**
     * Apply filters and fetch new earthquake data
     */
    function applyFilters() {
        // Hide filter panel properly
        if (elements.filterPanel && !elements.filterPanel.classList.contains('hidden')) {
            toggleFilterPanel(); // Use toggle function to ensure button state is updated too
        }
        
        // Get filter values
        const country = elements.countryFilter ? elements.countryFilter.value : 'all';
        const timeRange = elements.timeRange ? elements.timeRange.value : 'day';
        const magnitude = elements.magnitude ? elements.magnitude.value : '2.5';
        
        // Update URL with filter parameters
        updateUrlWithFilters(country, timeRange, magnitude);
        
        // Call the main app's fetchData function if available
        if (typeof fetchEarthquakeData === 'function') {
            showLoading();
            fetchEarthquakeData(timeRange, magnitude, country);
        }
    }
    
    /**
     * Show earthquake details panel
     */
    function showEarthquakeDetails(earthquakeId) {
        if (!elements.detailPanel || !earthquakeId) return;
        
        // Find earthquake data
        const earthquake = findEarthquakeById(earthquakeId);
        if (!earthquake) return;
        
        // Update detail content
        const detailContent = elements.detailPanel.querySelector('#detailContent');
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="detail-header">
                    <h2>M${earthquake.magnitude.toFixed(1)} Earthquake</h2>
                    <h3>${earthquake.place}</h3>
                    <p>${new Date(earthquake.time).toLocaleString()}</p>
                </div>
                <div class="detail-info">
                    <div class="detail-row">
                        <span class="detail-label">Depth</span>
                        <span class="detail-value">${earthquake.depth.toFixed(1)} km</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Coordinates</span>
                        <span class="detail-value">${earthquake.lat.toFixed(4)}, ${earthquake.lng.toFixed(4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Region</span>
                        <span class="detail-value">${getRegionName(earthquake.lat, earthquake.lng)}</span>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="detail-btn" onclick="window.map.flyTo([${earthquake.lat}, ${earthquake.lng}], 10)">
                        <i class="fas fa-map-marker-alt"></i> View on Map
                    </button>
                    <button class="detail-btn" onclick="window.open('https://earthquake.usgs.gov/earthquakes/eventpage/${earthquake.id}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> USGS Details
                    </button>
                </div>
            `;
        }
        
        // Show the panel
        elements.detailPanel.classList.remove('hidden');
    }
    
    /**
     * Hide earthquake details panel
     */
    function hideDetailPanel() {
        if (elements.detailPanel) {
            elements.detailPanel.classList.add('hidden');
        }
    }
    
    /**
     * Find earthquake by ID from global earthquakeData
     */
    function findEarthquakeById(id) {
        if (typeof window.earthquakeData === 'undefined') return null;
        
        return window.earthquakeData.find(eq => eq.id === id);
    }
    
    /**
     * Get region name from coordinates
     */
    function getRegionName(lat, lng) {
        // Simple region check based on bounding boxes
        const regions = {
            myanmar: { 
                minLat: 9.0, maxLat: 28.5, 
                minLng: 92.0, maxLng: 101.0,
                name: 'Myanmar'
            },
            thailand: { 
                minLat: 5.0, maxLat: 21.0, 
                minLng: 97.0, maxLng: 106.0,
                name: 'Thailand'
            },
            china: { 
                minLat: 18.0, maxLat: 54.0, 
                minLng: 73.0, maxLng: 135.0,
                name: 'China'
            },
            india: { 
                minLat: 6.0, maxLat: 37.0, 
                minLng: 68.0, maxLng: 97.0,
                name: 'India'
            },
            bangladesh: { 
                minLat: 20.0, maxLat: 26.5, 
                minLng: 88.0, maxLng: 92.5,
                name: 'Bangladesh'
            },
            laos: { 
                minLat: 13.0, maxLat: 23.0, 
                minLng: 100.0, maxLng: 108.0,
                name: 'Laos'
            }
        };
        
        for (const [key, region] of Object.entries(regions)) {
            if (lat >= region.minLat && lat <= region.maxLat && 
                lng >= region.minLng && lng <= region.maxLng) {
                return region.name;
            }
        }
        
        return 'International Waters';
    }
    
    /**
     * Update URL with filter parameters
     */
    function updateUrlWithFilters(country, timeRange, magnitude) {
        if (!history.pushState) return;
        
        const url = new URL(window.location);
        
        if (country && country !== 'all') {
            url.searchParams.set('country', country);
        } else {
            url.searchParams.delete('country');
        }
        
        if (timeRange && timeRange !== 'day') {
            url.searchParams.set('timeRange', timeRange);
        } else {
            url.searchParams.delete('timeRange');
        }
        
        if (magnitude && magnitude !== '2.5') {
            url.searchParams.set('magnitude', magnitude);
        } else {
            url.searchParams.delete('magnitude');
        }
        
        history.pushState({}, '', url);
    }
    
    /**
     * Apply URL parameters to filters
     */
    function applyUrlParams() {
        const url = new URL(window.location);
        
        // Set country filter
        const country = url.searchParams.get('country');
        if (country && elements.countryFilter) {
            elements.countryFilter.value = country;
        }
        
        // Set time range filter
        const timeRange = url.searchParams.get('timeRange');
        if (timeRange && elements.timeRange) {
            elements.timeRange.value = timeRange;
        }
        
        // Set magnitude filter
        const magnitude = url.searchParams.get('magnitude');
        if (magnitude && elements.magnitude) {
            elements.magnitude.value = magnitude;
        }
        
        // Apply filters if any parameters found
        if (country || timeRange || magnitude) {
            if (typeof fetchEarthquakeData === 'function') {
                fetchEarthquakeData(
                    elements.timeRange ? elements.timeRange.value : 'day',
                    elements.magnitude ? elements.magnitude.value : '2.5',
                    elements.countryFilter ? elements.countryFilter.value : 'all'
                );
            }
        }
    }
    
    /**
     * Show loading overlay
     */
    function showLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.remove('hidden');
        }
    }
    
    /**
     * Hide loading overlay
     */
    function hideLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('hidden');
        }
    }
    
    // Export public methods
    window.UI = {
        showLoading,
        hideLoading,
        showEarthquakeDetails,
        hideDetailPanel,
        isDarkMode: () => darkMode
    };
}); 