/**
 * charts.js - Chart initialization and functions
 */

/**
 * Initialize charts for statistics
 */
function initializeCharts() {
    // Magnitude distribution chart
    const magCtx = document.getElementById('magnitudeChart');
    if (magCtx) {
        state.magnitudeChart = new Chart(magCtx, {
            type: 'bar',
            data: {
                labels: ['<2', '2-3', '3-4', '4-5', '5-6', '6+'],
                datasets: [{
                    label: 'Earthquakes by Magnitude',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: Config.colors.magnitudes
                }]
            },
            options: getMobileResponsiveChartOptions()
        });
    }
    
    // Time distribution chart
    const timeCtx = document.getElementById('timeChart');
    if (timeCtx) {
        state.timeChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Earthquakes by Date',
                    data: [],
                    borderColor: Config.colors.primary,
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: getMobileResponsiveChartOptions()
        });
    }

    // Make charts responsive
    setupChartResponsiveness();
}

/**
 * Get mobile-responsive chart options
 */
function getMobileResponsiveChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                bodyFont: {
                    size: state.isMobile ? 12 : 14
                },
                titleFont: {
                    size: state.isMobile ? 12 : 14
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: state.isMobile ? 6 : 12,
                    font: {
                        size: state.isMobile ? 10 : 12
                    }
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    font: {
                        size: state.isMobile ? 10 : 12
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };
}

/**
 * Setup chart responsiveness
 */
function setupChartResponsiveness() {
    // Resize charts on window resize
    const resizeCharts = () => {
        if (state.magnitudeChart) state.magnitudeChart.resize();
        if (state.timeChart) state.timeChart.resize();
        if (window.historyChart) window.historyChart.resize();
    };
    
    // Observe container size changes
    if (window.ResizeObserver) {
        const chartContainers = document.querySelectorAll('.chart-container');
        const resizeObserver = new ResizeObserver(resizeCharts);
        chartContainers.forEach(container => resizeObserver.observe(container));
    }
}

/**
 * Update charts with new data
 */
function updateCharts(dateGroups, magCounts) {
    // Update magnitude chart
    if (state.magnitudeChart) {
        state.magnitudeChart.data.datasets[0].data = magCounts;
        state.magnitudeChart.update();
    }
    
    // Update time chart
    if (state.timeChart) {
        // Convert dateGroups object to sorted arrays for chart
        const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(a) - new Date(b));
        const counts = sortedDates.map(date => dateGroups[date]);
        
        // Limit to most recent dates if there are too many
        let displayDates = sortedDates;
        let displayCounts = counts;
        
        const maxDisplayPoints = state.isMobile ? 10 : 20;
        if (sortedDates.length > maxDisplayPoints) {
            displayDates = sortedDates.slice(sortedDates.length - maxDisplayPoints);
            displayCounts = counts.slice(counts.length - maxDisplayPoints);
        }
        
        // Format dates more nicely
        const formattedDates = displayDates.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        
        // Update chart
        state.timeChart.data.labels = formattedDates;
        state.timeChart.data.datasets[0].data = displayCounts;
        state.timeChart.update();
    }
}

/**
 * Update history chart with new data
 */
function updateHistoryChart(dateGroups) {
    const historyChartEl = document.getElementById('historyChart');
    if (!historyChartEl) return;
    
    // Sort dates
    const sortedDates = Object.keys(dateGroups).sort();
    const counts = sortedDates.map(date => dateGroups[date]);
    
    // Format dates more nicely
    const formattedDates = sortedDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    
    // Create chart if it doesn't exist, otherwise update
    if (!window.historyChart) {
        window.historyChart = new Chart(historyChartEl, {
            type: 'bar',
            data: {
                labels: formattedDates,
                datasets: [{
                    label: 'Earthquakes by Date',
                    data: counts,
                    backgroundColor: Config.colors.primary
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Earthquakes'
                        },
                        ticks: {
                            font: {
                                size: state.isMobile ? 10 : 12
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: state.isMobile ? 8 : 15,
                            font: {
                                size: state.isMobile ? 10 : 12
                            }
                        }
                    }
                }
            }
        });
    } else {
        window.historyChart.data.labels = formattedDates;
        window.historyChart.data.datasets[0].data = counts;
        window.historyChart.update();
    }
} 