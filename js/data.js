/**
 * data.js - Earthquake data fetching and processing
 */

/**
 * Fetch and display earthquake data
 */
async function fetchEarthquakeData() {
    // Clear existing markers
    if (state.markerClusterGroup) {
        state.markerClusterGroup.clearLayers();
    }
    state.markers = [];
    
    // Show loading overlay
    UI.showLoader();
    
    // Clear quake list
    UI.elements.quakeList.innerHTML = '';
    
    // Get selected values
    const timeRange = UI.elements.timeRange.value;
    const magnitude = UI.elements.magnitude.value;
    
    // Set up URL
    let url = Config.apis.usgsBase;
    
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
        UI.elements.refreshBtn.disabled = true;
        UI.elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Loading...';
        
        // Fetch the data with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, { 
            signal: controller.signal,
            cache: 'no-cache' // Don't use cached data
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store earthquake data for filtering later
        state.earthquakeData = data.features;
        
        // Process the data
        processEarthquakeData(state.earthquakeData);
        
        // Update last update time
        UI.updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error fetching earthquake data:', error);
        
        // Show error notification
        if (error.name === 'AbortError') {
            showNotification('Request timed out. Please check your connection and try again.', 'warning');
        } else {
            showNotification('Failed to fetch earthquake data. Please try again.', 'warning');
        }
        
        // Try to use cached data if available
        if (state.earthquakeData.length > 0) {
            showNotification('Showing cached data from last successful fetch.', 'info');
            processEarthquakeData(state.earthquakeData);
        }
    } finally {
        // Reset loading state
        document.body.style.cursor = 'default';
        UI.elements.refreshBtn.disabled = false;
        UI.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh Data';
        
        // Hide loading overlay
        UI.hideLoader();
    }
}

/**
 * Process and display earthquake data
 */
function processEarthquakeData(features) {
    // Use empty array if features is undefined
    features = features || [];
    
    // Clear existing markers
    if (state.markerClusterGroup) {
        state.markerClusterGroup.clearLayers();
    }
    state.markers = [];
    
    // Clear quake list
    UI.elements.quakeList.innerHTML = '';
    
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
    
    // Update heatmap data
    updateHeatmap(features);
    
    features.forEach(feature => {
        const { mag, place, time } = feature.properties;
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
                url: feature.properties.url
            });
        }
        
        // Add marker to map
        const markerInfo = addEarthquakeMarker(feature);
        
        // Add to quake list
        UI.addToQuakeList(feature, markerInfo.inMyanmar, markerInfo.color);
    });
    
    // Update statistics
    UI.elements.totalQuakes.textContent = features.length;
    UI.elements.myanmarQuakes.textContent = myanmarCount;
    UI.elements.largestMag.textContent = largestMagnitude.toFixed(1);
    
    // Update statistics tab
    updateStatistics(features.length, myanmarCount, largestMagnitude, totalDepth, avgMag, locationCounts, dateGroups, quakesThisWeek, magCounts);
    
    // Update impact assessment
    updateImpactAssessment(significantQuakes);
    
    // Check if we should show notifications
    if (state.notificationsEnabled) {
        checkForNotifications(features);
    }
}

/**
 * Update statistics with calculated metrics
 */
function updateStatistics(total, myanmarCount, largestMag, totalDepth, totalMag, locationCounts, dateGroups, weekCount, magCounts) {
    // Calculate averages
    const avgDepth = total > 0 ? totalDepth / total : 0;
    const avgMag = total > 0 ? totalMag / total : 0;
    
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
    if (UI.elements.avgMagnitude) UI.elements.avgMagnitude.textContent = avgMag.toFixed(2);
    if (UI.elements.avgDepth) UI.elements.avgDepth.textContent = avgDepth.toFixed(2) + ' km';
    if (UI.elements.activeArea) UI.elements.activeArea.textContent = mostActiveArea;
    if (UI.elements.weekCount) UI.elements.weekCount.textContent = weekCount;
    
    // Update charts if available
    updateCharts(dateGroups, magCounts);
}

/**
 * Update the impact assessment tab
 */
function updateImpactAssessment(significantQuakes) {
    if (!UI.elements.recentSignificant) return;
    
    if (significantQuakes.length === 0) {
        UI.elements.recentSignificant.classList.add('d-none');
        if (UI.elements.populationImpact) UI.elements.populationImpact.textContent = 'No significant events to analyze';
        if (UI.elements.infrastructureImpact) UI.elements.infrastructureImpact.textContent = 'No significant events to analyze';
        if (UI.elements.historicalComparison) UI.elements.historicalComparison.textContent = 'No data available';
        return;
    }
    
    // Sort by magnitude (highest first)
    significantQuakes.sort((a, b) => b.magnitude - a.magnitude);
    
    // Show the most significant earthquake
    const mostSignificant = significantQuakes[0];
    
    UI.elements.recentSignificant.classList.remove('d-none');
    if (UI.elements.significantDetails) {
        UI.elements.significantDetails.innerHTML = `
            <strong>M${mostSignificant.magnitude.toFixed(1)}</strong> earthquake near ${mostSignificant.place}<br>
            Time: ${formatDate(mostSignificant.time)}<br>
            Depth: ${mostSignificant.depth.toFixed(2)} km<br>
            <button class="btn btn-sm btn-primary mt-2" onclick="state.map.setView([${mostSignificant.latitude}, ${mostSignificant.longitude}], 10)">View on map</button>
        `;
    }
    
    // Simple impact assessments (in a real app, this would use more sophisticated models)
    if (UI.elements.populationImpact) {
        UI.elements.populationImpact.innerHTML = getPopulationImpactText(mostSignificant);
    }
    
    if (UI.elements.infrastructureImpact) {
        UI.elements.infrastructureImpact.innerHTML = getInfrastructureImpactText(mostSignificant);
    }
    
    if (UI.elements.historicalComparison) {
        UI.elements.historicalComparison.innerHTML = getHistoricalComparisonText(mostSignificant);
    }
}

/**
 * Template functions for impact assessment
 */
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

/**
 * Fetch historical earthquake data
 */
async function fetchHistoricalData() {
    if (!UI.elements.historyDateRange || !UI.elements.historyMinMag || !UI.elements.historyTableBody) {
        return;
    }
    
    // Get date range and magnitude filter
    const dateRange = $(UI.elements.historyDateRange).data('daterangepicker');
    const minMag = parseFloat(UI.elements.historyMinMag.value) || 4.0;
    
    if (!dateRange) return;
    
    const startDate = dateRange.startDate.format('YYYY-MM-DD');
    const endDate = dateRange.endDate.format('YYYY-MM-DD');
    
    // Show loading
    UI.showLoader();
    
    try {
        // Build USGS API query
        const url = `${Config.apis.usgsQuery}?format=geojson&starttime=${startDate}&endtime=${endDate}&minmagnitude=${minMag}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display historical data
        displayHistoricalData(data.features);
        
    } catch (error) {
        console.error('Error fetching historical data:', error);
        showNotification('Failed to fetch historical earthquake data. Please try again.', 'warning');
    } finally {
        // Hide loading
        UI.hideLoader();
    }
}

/**
 * Display historical earthquake data
 */
function displayHistoricalData(features) {
    if (!UI.elements.historyTableBody) return;
    
    // Clear existing data
    UI.elements.historyTableBody.innerHTML = '';
    
    // Handle empty response
    if (!features || features.length === 0) {
        UI.elements.historyTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No earthquakes found in the selected date range.</td></tr>';
        return;
    }
    
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
        UI.elements.historyTableBody.appendChild(tr);
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
            $(UI.elements.historyModal).modal('hide');
            
            // Center map on earthquake
            state.map.setView([lat, lng], 10);
            
            // Show temporary marker
            const tempMarker = L.marker([lat, lng]).addTo(state.map);
            tempMarker.bindPopup(`
                <strong>Historical Earthquake</strong><br>
                <strong>Magnitude:</strong> ${mag}<br>
                <strong>Location:</strong> ${place}<br>
                <strong>Time:</strong> ${formatDate(time)}<br>
                <strong>Depth:</strong> ${depth.toFixed(2)} km
            `).openPopup();
            
            // Remove marker after 30 seconds
            setTimeout(() => {
                state.map.removeLayer(tempMarker);
            }, 30000);
        });
    });
    
    // Update chart if available
    if (typeof updateHistoryChart === 'function') {
        updateHistoryChart(dateGroups);
    }
    
    // Show summary
    showNotification(`Showing ${features.length} historical earthquakes`);
}

/**
 * Check for earthquakes that meet notification criteria
 */
function checkForNotifications(features) {
    if (!state.notificationsEnabled) return;
    
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
        if (state.notificationSettings.myanmarOnly && !inMyanmar) return;
        if (mag < state.notificationSettings.minMagnitude) return;
        
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

/**
 * Send browser notification
 */
function sendEarthquakeNotification(mag, place, time, lat, lng) {
    if (!Notification) return;
    
    if (Notification.permission === "granted") {
        const notification = new Notification("Earthquake Alert", {
            body: `M${mag.toFixed(1)} earthquake near ${place} at ${formatDate(time)}`,
            icon: "https://earthquake.usgs.gov/theme/images/usgs-logo.png"
        });
        
        notification.onclick = function() {
            window.focus();
            state.map.setView([lat, lng], 10);
        };
    }
}

/**
 * Add notification to history panel
 */
function addNotificationToHistory(mag, place, time) {
    if (!UI.elements.notificationList) return;
    
    const item = document.createElement('div');
    item.className = 'notification-item unread';
    item.innerHTML = `
        <strong>M${mag.toFixed(1)}</strong> earthquake near ${place}<br>
        <small>${formatDate(time)}</small>
    `;
    
    // Add at the top
    if (UI.elements.notificationList.firstChild) {
        UI.elements.notificationList.insertBefore(item, UI.elements.notificationList.firstChild);
    } else {
        UI.elements.notificationList.appendChild(item);
    }
    
    // Remove old notifications if we have too many
    const notifications = UI.elements.notificationList.getElementsByClassName('notification-item');
    if (notifications.length > 10) {
        UI.elements.notificationList.removeChild(notifications[notifications.length - 1]);
    }
} 