/**
 * Notification Manager for Myanmar Earthquake Tracker
 * Handles push notifications and permission requests
 */

window.NotificationManager = (function() {
    // Private variables
    let _notificationPermission = 'default';
    let _pushSubscription = null;
    
    // DOM elements
    const _notificationButton = document.getElementById('notificationBtn');
    const _notificationBanner = document.getElementById('notification-banner');
    const _notificationMessage = document.getElementById('notification-message');
    const _notificationClose = document.getElementById('notification-close');
    
    // Check if notifications are supported
    const _isNotificationSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    /**
     * Initialize the notification system
     */
    function init() {
        if (!_isNotificationSupported) {
            console.log('Notifications not supported in this browser');
            if (_notificationButton) {
                _notificationButton.style.display = 'none';
            }
            return;
        }
        
        // Check current permission
        _notificationPermission = Notification.permission;
        updateNotificationUI();
        
        // Add event listeners
        if (_notificationButton) {
            _notificationButton.addEventListener('click', requestNotificationPermission);
        }
        
        if (_notificationClose) {
            _notificationClose.addEventListener('click', hideNotificationBanner);
        }
        
        // Show notification banner if permission is default and on mobile
        if (_notificationPermission === 'default' && isMobileDevice()) {
            setTimeout(showNotificationBanner, 3000);
        }
        
        // Set up service worker communication
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }
    }
    
    /**
     * Check if the device is mobile
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Handle messages from service worker
     */
    function handleServiceWorkerMessage(event) {
        const data = event.data;
        
        if (data && data.type === 'GET_REGION') {
            // Send the current region selection to the service worker
            const countryFilter = document.getElementById('countryFilter');
            const selectedRegion = countryFilter ? countryFilter.value : 'myanmar';
            
            event.ports[0].postMessage({
                region: selectedRegion
            });
        } else if (data && data.type === 'NEW_EARTHQUAKE') {
            // Show in-app notification for new earthquake
            showBannerMessage(`New M${data.magnitude.toFixed(1)} earthquake detected in ${data.place}`);
        }
    }
    
    /**
     * Request notification permission
     */
    function requestNotificationPermission() {
        if (!_isNotificationSupported) return;
        
        showBannerMessage('Requesting notification permission...');
        
        Notification.requestPermission().then(permission => {
            _notificationPermission = permission;
            updateNotificationUI();
            
            if (permission === 'granted') {
                subscribeToPushNotifications();
                showBannerMessage('Notifications enabled! You will now receive alerts for significant earthquakes.', 5000);
            } else if (permission === 'denied') {
                showBannerMessage('Notification permission denied. You won\'t receive alerts about new earthquakes.', 5000);
            }
        });
    }
    
    /**
     * Subscribe to push notifications
     */
    function subscribeToPushNotifications() {
        if (_notificationPermission !== 'granted') return;
        
        navigator.serviceWorker.ready.then(registration => {
            if (!registration.pushManager) {
                console.log('Push notifications not supported by the browser');
                return;
            }
            
            // This is a dummy VAPID key - in a real app, this would be your server's public key
            const applicationServerKey = urlBase64ToUint8Array(
                'BDTTIAk-x_QPSGnWkSPq5kh4J5dXPvY3qmSDJsYvY7oIxGzTFE9Ey0P3xCiiLwXOGbT0MilBGHt7cR_AYh8Y4Qo'
            );
            
            registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            }).then(subscription => {
                _pushSubscription = subscription;
                console.log('User subscribed to push notifications');
                
                // Send a test notification
                setTimeout(() => {
                    sendTestNotification();
                }, 1000);
                
                // In a real app, you would send the subscription to your server
                // sendSubscriptionToServer(subscription);
            }).catch(error => {
                console.error('Failed to subscribe to push notifications:', error);
                showBannerMessage('Could not enable notifications. Please try again later.', 5000);
            });
        });
    }
    
    /**
     * Send a test notification
     */
    function sendTestNotification() {
        if (_notificationPermission !== 'granted') return;
        
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Earthquake Notifications Enabled', {
                body: 'You will now receive alerts for significant earthquakes in your selected region.',
                vibrate: [100, 50, 100],
                data: {
                    url: window.location.href
                }
            });
        });
    }
    
    /**
     * Show notification for a new earthquake
     */
    function notifyNewEarthquake(quake) {
        if (_notificationPermission !== 'granted') return;
        
        // Create a notification through the service worker
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`M${quake.magnitude.toFixed(1)} Earthquake`, {
                body: `${quake.place}\nDepth: ${quake.depth.toFixed(1)}km\n${new Date(quake.time).toLocaleString()}`,
                vibrate: [100, 50, 100, 50, 100],
                data: {
                    url: window.location.href,
                    quake: quake
                }
            });
        });
        
        // Also show in-app notification
        showBannerMessage(`M${quake.magnitude.toFixed(1)} earthquake detected in ${quake.place}`, 8000);
    }
    
    /**
     * Update notification UI based on permission
     */
    function updateNotificationUI() {
        if (!_notificationButton) return;
        
        if (_notificationPermission === 'granted') {
            _notificationButton.innerHTML = '<i class="fas fa-bell"></i>';
            _notificationButton.title = 'Notifications enabled';
            _notificationButton.classList.remove('pulse');
        } else if (_notificationPermission === 'denied') {
            _notificationButton.innerHTML = '<i class="fas fa-bell-slash"></i>';
            _notificationButton.title = 'Notifications blocked';
            _notificationButton.classList.remove('pulse');
        } else {
            _notificationButton.innerHTML = '<i class="fas fa-bell"></i>';
            _notificationButton.title = 'Enable notifications';
            _notificationButton.classList.add('pulse');
        }
    }
    
    /**
     * Show the notification banner with a permission request
     */
    function showNotificationBanner() {
        if (_notificationBanner && _notificationPermission === 'default') {
            _notificationMessage.textContent = 'Get alerts for significant earthquakes. Enable notifications?';
            _notificationBanner.classList.remove('hidden');
        }
    }
    
    /**
     * Hide the notification banner
     */
    function hideNotificationBanner() {
        if (_notificationBanner) {
            _notificationBanner.classList.add('hidden');
        }
    }
    
    /**
     * Show a message in the notification banner
     */
    function showBannerMessage(message, duration = 5000) {
        if (_notificationBanner) {
            _notificationMessage.textContent = message;
            _notificationBanner.classList.remove('hidden');
            
            if (duration > 0) {
                setTimeout(hideNotificationBanner, duration);
            }
        }
    }
    
    /**
     * Convert base64 string to Uint8Array
     * Used for VAPID key conversion
     */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // Initialize on load
    window.addEventListener('load', init);
    
    // Public API
    return {
        notifyNewEarthquake,
        requestPermission: requestNotificationPermission,
        showMessage: showBannerMessage
    };
})(); 