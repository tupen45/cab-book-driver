import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import io from 'socket.io-client';

const socket = io("http://192.168.196.98:3000"); // Replace with your server IP

export default function DriverScreen() {
  const [driverLocation, setDriverLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [rideAccepted, setRideAccepted] = useState(false);
  const [username,setusername]=useState('')

  useEffect(() => {
    // Get initial driver location
    Geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setDriverLocation({ latitude, longitude });
      },
      err => console.error(err),
      { enableHighAccuracy: true }
    );

    // Listen for ride requests
    socket.on("ride-request", (data) => {
      setPickupLocation(data.pickup);
      setDestination(data.destination);
      setusername(data.userName);
      Alert.alert("New Ride Request", `Pickup: ${data.pickup.latitude.toFixed(5)}, ${data.pickup.longitude.toFixed(5)}`);
    });

    return () => {
      socket.off("ride-request");
    };
  }, []);

  useEffect(() => {
    // Send driver's location updates every 3 seconds
    const interval = setInterval(() => {
      Geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          const updatedLocation = { latitude, longitude };
          setDriverLocation(updatedLocation);

          if (rideAccepted) {
            socket.emit("driver-location-update", updatedLocation);
          }
        },
        err => console.error(err),
        { enableHighAccuracy: true }
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [rideAccepted]);

  const handleAcceptRide = () => {
    if (!driverLocation || !pickupLocation) return;

    socket.emit("accept-ride", {
      pickup: pickupLocation,
      destination,
    });

    Alert.alert("Ride Accepted", "Heading to customer pickup location");
    setRideAccepted(true);
  };

  return (
    <View style={{ flex: 1 }}>
      {driverLocation && (
        <MapView
          style={{ flex: 1 }}
          region={{
            ...driverLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
        >
          {/* Driver Marker */}
          <Marker coordinate={driverLocation} title="Driver Location" pinColor="blue" />

          {/* Customer Pickup Marker */}
          {pickupLocation && (
            <Marker coordinate={pickupLocation} title="Customer Pickup" pinColor="green" />
          )}

          {/* Destination Marker */}
          {rideAccepted && destination && (
            <Marker coordinate={destination} title="Destination" />
          )}

          {/* Route line */}
          {rideAccepted && driverLocation && pickupLocation && destination && (
            <Polyline
              coordinates={[driverLocation, pickupLocation, destination]}
              strokeColor="#FF5733"
              strokeWidth={4}
            />
          )}
        </MapView>
      )}

      {!rideAccepted && pickupLocation && (
        <View style={styles.bottomBox}>
        <Text>{username}</Text>
          <Text style={styles.label}>Pickup: {pickupLocation.latitude.toFixed(5)}, {pickupLocation.longitude.toFixed(5)}</Text>
          <Text style={styles.label}>Destination: {destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</Text>
          <Text style={styles.acceptButton} onPress={handleAcceptRide}>Accept Ride</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBox: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 6,
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  acceptButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    fontWeight: 'bold',
  },
});
