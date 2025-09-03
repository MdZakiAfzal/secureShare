const axios = require('axios');

// Get city from IP address
exports.getCityFromIP = async (ip) => {
    try {
        // For development/localhost
        if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
            // Return a mock city for testing
            return 'TestCity';
        }
        
        // Use IP API service (free tier)
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,city`);
        
        if (response.data.status === 'success') {
            return response.data.city;
        }
        
        console.log('IP API response:', response.data);
        return null;
    } catch (error) {
        console.error('Geolocation error:', error.message);
        return null;
    }
};

// Validate if city is in allowed list
exports.validateCityAccess = (userCity, allowedCities) => {
    if (!allowedCities || allowedCities.length === 0) return true;
    
    if (!userCity) return false;
    
    // Case-insensitive comparison
    return allowedCities.some(allowedCity => 
        userCity.toLowerCase() === allowedCity.toLowerCase()
    );
};