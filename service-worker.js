/**
 * Service Worker for Myanmar Earthquake Tracker
 * Provides offline capability and handles push notifications
 */

// Version for cache
const CACHE_VERSION = 'v1';
const CACHE_NAME = `earthquake-tracker-${CACHE_VERSION}`;

// Files to cache for offline use
const CACHE_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/js/ui.js',
  '/js/data.js',
  '/js/config.js',
  '/js/charts.js',
  '/js/notifications.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
];

// Install event - cache files for offline use
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(CACHE_FILES);
      })
      .catch(error => {
        console.error('[Service Worker] Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker');
  
  // Claim clients to ensure the service worker controls all clients immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests and cross-origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    // For API requests or other, try the network first, fallback to a generic offline response
    if (event.request.url.includes('earthquake.usgs.gov')) {
      return event.respondWith(
        fetch(event.request)
          .catch(() => {
            return caches.match('/offline-data.json')
              .then(response => {
                if (response) {
                  return response;
                }
                // If no offline data, return a simple JSON response
                return new Response(
                  JSON.stringify({
                    features: [],
                    metadata: {
                      status: 200,
                      title: "Offline Mode",
                      url: event.request.url
                    }
                  }),
                  {
                    headers: { 'Content-Type': 'application/json' }
                  }
                );
              });
          })
      );
    }
    
    return;
  }
  
  // For all other requests, implement a "stale-while-revalidate" strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response immediately if available
        const fetchPromise = fetch(event.request)
          .then(response => {
            // Update the cache with the new version
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // If fetch fails and we don't have a cached response, show offline page
            if (!cachedResponse) {
              return caches.match('/index.html');
            }
          });
        
        return cachedResponse || fetchPromise;
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  
  // Parse data if provided
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New Earthquake Alert',
        body: event.data.text(),
      };
    }
  }
  
  const title = data.title || 'Earthquake Alert';
  const options = {
    body: data.body || 'Check the app for new earthquake information',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      quake: data.quake || null
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - open app and focus on earthquake
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  // Get earthquake data if available
  const quakeData = event.notification.data.quake;
  let url = event.notification.data.url || '/';
  
  // If we have quake data, add parameters to URL to focus on this earthquake
  if (quakeData && quakeData.id) {
    url = `${url}?quake=${quakeData.id}&lat=${quakeData.lat}&lng=${quakeData.lng}`;
  }
  
  // Open or focus the window with the earthquake data
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(clientList => {
      // If we have an existing window, focus it
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.navigate(url).then(client => client.focus());
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Periodic sync event - check for new earthquakes periodically
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-earthquakes') {
    event.waitUntil(checkForSignificantEarthquakes());
  }
});

// Function to check for significant earthquakes
async function checkForSignificantEarthquakes() {
  try {
    // Define URLs for earthquake data
    const urls = [
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson'
    ];
    
    // Try each URL until one succeeds
    let response = null;
    for (const url of urls) {
      try {
        response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) break;
      } catch (e) {
        console.log(`Failed to fetch from ${url}: ${e.message}`);
      }
    }
    
    if (!response || !response.ok) {
      console.log('Could not fetch earthquake data from any source');
      return;
    }
    
    // Process the data
    const data = await response.json();
    
    // Get clients to check for region preference
    const clients = await self.clients.matchAll({ type: 'window' });
    let selectedRegion = 'myanmar'; // Default to Myanmar
    
    // Check if any client has a stored region preference
    if (clients.length > 0) {
      try {
        const message = await new Promise((resolve) => {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = event => resolve(event.data);
          clients[0].postMessage({ type: 'GET_REGION' }, [messageChannel.port2]);
          
          // Timeout after 1 second
          setTimeout(() => resolve({ region: 'myanmar' }), 1000);
        });
        
        selectedRegion = message.region || 'myanmar';
      } catch (e) {
        console.error('Error getting region from client:', e);
      }
    }
    
    // Filter for significant earthquakes in the region
    const currentTime = new Date().getTime();
    const oneHourAgo = currentTime - (60 * 60 * 1000); // 1 hour ago
    
    const significantQuakes = data.features.filter(feature => {
      // Only consider earthquakes in the last hour
      if (feature.properties.time < oneHourAgo) {
        return false;
      }
      
      // Check if in selected region
      if (selectedRegion !== 'all') {
        const coords = feature.geometry.coordinates;
        const lat = coords[1];
        const lng = coords[0];
        
        // Define region boundaries (rough approximations)
        const regions = {
          myanmar: { 
            minLat: 9.0, maxLat: 28.5, 
            minLng: 92.0, maxLng: 101.0
          },
          thailand: { 
            minLat: 5.0, maxLat: 21.0, 
            minLng: 97.0, maxLng: 106.0
          },
          china: { 
            minLat: 18.0, maxLat: 54.0, 
            minLng: 73.0, maxLng: 135.0
          },
          india: { 
            minLat: 6.0, maxLat: 37.0, 
            minLng: 68.0, maxLng: 97.0
          },
          bangladesh: { 
            minLat: 20.0, maxLat: 26.5, 
            minLng: 88.0, maxLng: 92.5
          },
          laos: { 
            minLat: 13.0, maxLat: 23.0, 
            minLng: 100.0, maxLng: 108.0
          }
        };
        
        const region = regions[selectedRegion];
        if (!region) return true; // If no defined region, include it
        
        // Check if coordinates are in region
        if (lat < region.minLat || lat > region.maxLat || 
            lng < region.minLng || lng > region.maxLng) {
          return false;
        }
      }
      
      return true;
    });
    
    // Show notification for each significant earthquake (limit to 3)
    for (let i = 0; i < Math.min(significantQuakes.length, 3); i++) {
      const quake = significantQuakes[i];
      const properties = quake.properties;
      const coords = quake.geometry.coordinates;
      
      const title = `M${properties.mag.toFixed(1)} Earthquake`;
      const options = {
        body: `${properties.place}\nDepth: ${coords[2].toFixed(1)}km\n${new Date(properties.time).toLocaleDateString()}`,
        vibrate: [100, 50, 100],
        data: {
          url: '/',
          quake: {
            id: quake.id || properties.code,
            lat: coords[1],
            lng: coords[0],
            depth: coords[2],
            magnitude: properties.mag,
            place: properties.place,
            time: properties.time
          }
        }
      };
      
      await self.registration.showNotification(title, options);
    }
    
  } catch (error) {
    console.error('Error checking for earthquakes:', error);
  }
}
