# Myanmar Earthquake Tracker

A comprehensive web application that displays real-time earthquake data with a focus on Myanmar. This advanced tool helps monitor seismic activity in the region by fetching and visualizing data from the USGS Earthquake API, providing essential information for awareness and emergency response.

## Features

### Core Features
- Interactive map displaying earthquake locations with color-coded markers based on magnitude
- Multiple map layer options (Street, Satellite, Terrain, Dark Mode)
- Advanced filtering by time range, magnitude, depth, and custom date range
- Special highlighting for earthquakes in the Myanmar region
- Responsive design that works on desktop and mobile devices

### Advanced Visualization
- Heatmap visualization option for earthquake density
- Marker clustering for better performance with large datasets
- Customizable map views and fullscreen mode
- Color-coded severity indicators for quick assessment

### Data Analysis
- Comprehensive statistics dashboard with charts and metrics
- Magnitude distribution charts
- Temporal analysis of earthquake frequency
- Region-specific statistics with focus on Myanmar
- Export functionality for earthquake data (CSV format)

### Impact Assessment
- Potential population exposure analysis for significant earthquakes
- Infrastructure vulnerability assessment
- Historical comparison with previous significant events
- Emergency resources and safety information

### Real-time Updates
- Automatic data refresh options
- Real-time browser notifications for new significant earthquakes
- Customizable notification threshold settings
- Notification history panel

### Historical Data
- Access to historical earthquake data beyond real-time feeds
- Custom date range selection for historical analysis
- Comparative visualization of historical patterns
- Detailed view of past significant events

### Additional Features
- Search and filter earthquake list
- Sorting options by time, magnitude, and depth
- Detailed information panels for specific earthquakes
- Nearby earthquake analysis for selected events
- Share functionality for current map view
- Multiple language support (English, Burmese, Thai, Chinese)
- Keyboard shortcuts for common actions
- Dark mode support
- Local storage for user preferences

## Technology Used

- HTML5, CSS3, and JavaScript
- [Leaflet.js](https://leafletjs.com/) for interactive mapping
- [Chart.js](https://www.chartjs.org/) for data visualization
- [Bootstrap 5](https://getbootstrap.com/) for responsive UI components
- [Moment.js](https://momentjs.com/) for date/time handling
- [jQuery](https://jquery.com/) for DOM manipulation
- [DateRangePicker](https://www.daterangepicker.com/) for date selection
- [USGS Earthquake API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) for real-time earthquake data
- Browser Notifications API for alerts
- LocalStorage for persistence of user preferences

## How to Use

1. Open `index.html` in a web browser
2. The application will automatically load the most recent earthquake data
3. Use the dropdown menus to filter by time range and magnitude
4. Click on markers or list items to see detailed information about each earthquake
5. Use the tabs to access different features (Earthquakes, Statistics, Impact, Resources)
6. Enable notifications for alerts about new significant earthquakes
7. Use the "Historical Data" button to access past earthquake information
8. Toggle advanced features like heatmap, fullscreen mode, and different map layers

### Keyboard Shortcuts
- Alt+R: Refresh earthquake data
- Alt+F: Toggle fullscreen map
- Alt+H: Toggle heatmap view

## Local Development

No build process or special dependencies are required. Simply edit the HTML, CSS, and JavaScript files directly. All dependencies are loaded from CDNs for simplicity.

## About the USGS Earthquake API

This application uses the United States Geological Survey (USGS) Earthquake API, which provides real-time data on earthquakes worldwide. The API offers GeoJSON feeds that are updated every minute for real-time data, as well as query endpoints for historical data.

## License

This project is open source and available for anyone to use, especially for helping monitor and respond to seismic activity in Myanmar. 