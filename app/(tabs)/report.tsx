import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "../../components/Map";
import type { Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../lib/AuthProvider";
import { CATEGORIES } from "../../lib/constants";
import { supabase } from "../../lib/supabase";

import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Input } from "../../components/ui/Input";
import { Typography } from "../../components/ui/Typography";

const MAX_REPORT_IMAGES = 5;

export default function AddReportScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<"lost" | "found">("lost");
  const [category, setCategory] = useState("other");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinate, setCoordinate] = useState({
    latitude: 10.744323,
    longitude: 124.791936,
  });
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 10.744323,
    longitude: 124.791936,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [loading, setLoading] = useState(false);
  const [isMapModalVisible, setMapModalVisible] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [imageUris, setImageUris] = useState<string[]>([]);

  useEffect(() => {
    requestLocation();
  }, []);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCoordinate(next);
      setMapRegion((prev) => ({ ...prev, ...next }));
    } catch (e) {
      console.log("Location error", e);
    }
  }

  async function pickImage() {
    if (imageUris.length >= MAX_REPORT_IMAGES) {
      Alert.alert(
        "Limit reached",
        `You can upload up to ${MAX_REPORT_IMAGES} photos.`,
      );
      return;
    }
    const remaining = MAX_REPORT_IMAGES - imageUris.length;
    const allowMultiple = remaining > 1;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: !allowMultiple,
      allowsMultipleSelection: allowMultiple,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUris((prev) => {
        const picked = result.assets.map((asset) => asset.uri);
        const next = [...prev, ...picked];
        return next.slice(0, MAX_REPORT_IMAGES);
      });
    }
  }

  function removeImage(uri: string) {
    setImageUris((prev) => prev.filter((item) => item !== uri));
  }

  async function handleSubmit() {
    if (!itemName) return Alert.alert("Error", "Please fill in item name");
    setLoading(true);
    const uploadedImageUrls: string[] = [];
    for (const [index, uri] of imageUris.entries()) {
      const fileName = `${Date.now()}-${session?.user?.id}-${index}.jpg`;
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as any);
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(fileName, formData);
      if (uploadError) {
        Alert.alert("Upload Error", uploadError.message);
        setLoading(false);
        return;
      }
      uploadedImageUrls.push(
        supabase.storage.from("reports").getPublicUrl(fileName).data.publicUrl,
      );
    }

    const { error } = await supabase.from("reports").insert({
      user_id: session?.user?.id,
      type,
      category,
      status: "active",
      item_name: itemName,
      description,
      location_name: locationName,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      image_url: uploadedImageUrls[0] || null,
      image_urls: uploadedImageUrls,
    });

    setLoading(false);
    if (error)
      Alert.alert("Error", "Failed to create report: " + error.message);
    else {
      router.push("/(tabs)");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Typography variant="h2">New Report</Typography>
          <Typography variant="subtitle">
            Help reunite an item with its owner.
          </Typography>
        </View>

        <View style={styles.section}>
          <Typography variant="label">Report Type</Typography>
          <View style={styles.row}>
            <TypeButton
              active={type === "lost"}
              variant="lost"
              label="I lost something"
              onPress={() => setType("lost")}
            />
            <TypeButton
              active={type === "found"}
              variant="found"
              label="I found something"
              onPress={() => setType("found")}
            />
          </View>
        </View>

        <Input
          label="Item Name"
          placeholder="e.g. Blue Hydroflask"
          value={itemName}
          onChangeText={setItemName}
        />

        <View style={styles.section}>
          <Typography variant="label">Category</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={category === cat}
                onPress={() => setCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        <Input
          label="Description"
          placeholder="Describe the item..."
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.section}>
          <Typography variant="label">Precise Map Location</Typography>
          <TouchableOpacity
            style={styles.openMapBtn}
            onPress={() => setMapModalVisible(true)}
          >
            <Ionicons name="map" size={24} color="#b6a0ff" />
            <Typography style={styles.openMapText}>
              Open Map to Pin Location
            </Typography>
            <Ionicons name="chevron-forward" size={20} color="#adaaaa" />
          </TouchableOpacity>
        </View>

        <Input
          label="Location Description (Optional)"
          icon="location-outline"
          placeholder="e.g. Student Union Floor 2"
          value={locationName}
          onChangeText={setLocationName}
        />

        <View style={styles.section}>
          <Typography variant="label">Photo (Optional)</Typography>
          <View style={styles.uploadArea}>
            {imageUris.length === 0 ? (
              <TouchableOpacity style={styles.uploadEmpty} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color="#adaaaa" />
                <Typography variant="small">Tap to add a photo</Typography>
              </TouchableOpacity>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.uploadRow}
              >
                {imageUris.map((uri) => (
                  <View key={uri} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumbImage} />
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removeImage(uri)}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUris.length < MAX_REPORT_IMAGES && (
                  <TouchableOpacity style={styles.addTile} onPress={pickImage}>
                    <Ionicons name="add" size={24} color="#b6a0ff" />
                    <Typography variant="small" style={styles.addTileText}>
                      Add
                    </Typography>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
          <Typography variant="small" style={styles.imageHint}>
            Up to {MAX_REPORT_IMAGES} photos. You can crop each photo freely.
          </Typography>
        </View>

        <Button
          title="Post Report"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      <MapModal
        visible={isMapModalVisible}
        onClose={() => setMapModalVisible(false)}
        coordinate={coordinate}
        setCoordinate={setCoordinate}
        mapRegion={mapRegion}
        setMapRegion={setMapRegion}
        mapType={mapType}
        setMapType={setMapType}
        type={type}
      />
    </SafeAreaView>
  );
}

// Internal Helper Components
const TypeButton = ({ active, variant, label, onPress }: any) => (
  <TouchableOpacity
    style={[
      styles.typeCard,
      active
        ? variant === "lost"
          ? styles.typeCardLost
          : styles.typeCardFound
        : styles.typeCardIdle,
    ]}
    onPress={onPress}
  >
    <Ionicons
      name={variant === "lost" ? "search-outline" : "checkmark-circle-outline"}
      size={32}
      color={active ? (variant === "lost" ? "#ff716b" : "#3fff8b") : "#adaaaa"}
    />
    <Typography
      weight="bold"
      color={active ? "#fff" : "#adaaaa"}
      style={{ marginTop: 12 }}
    >
      {label}
    </Typography>
  </TouchableOpacity>
);

const MapModal = ({
  visible,
  onClose,
  coordinate,
  setCoordinate,
  mapRegion,
  setMapRegion,
  mapType,
  setMapType,
  type,
}: any) => {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!visible) return;
    mapRef.current?.animateToRegion(mapRegion, 350);
  }, [visible, mapRegion]);

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Typography variant="body" weight="bold">
            Set Pin Location
          </Typography>
          <TouchableOpacity onPress={onClose}>
            <Typography color="#b6a0ff" weight="bold">
              Confirm
            </Typography>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, backgroundColor: "#000000" }}>
          <MapView
            ref={(ref) => {
              mapRef.current = ref;
            }}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1, backgroundColor: "#000000" }}
            mapType={mapType}
            initialRegion={mapRegion}
            onRegionChangeComplete={setMapRegion}
            showsUserLocation={true}
            onPress={(e) => setCoordinate(e.nativeEvent.coordinate)}
            loadingEnabled={true}
            loadingBackgroundColor="#000000"
            loadingIndicatorColor="#b6a0ff"
          >
            <Marker coordinate={coordinate}>
              <View
                style={type === "lost" ? styles.mapPinLost : styles.mapPinFound}
              >
                <View
                  style={
                    type === "lost" ? styles.pinInnerLost : styles.pinInnerFound
                  }
                />
              </View>
            </Marker>
          </MapView>
        </View>
        <TouchableOpacity
          style={styles.mapTypeToggle}
          onPress={() =>
            setMapType(mapType === "standard" ? "satellite" : "standard")
          }
        >
          <Ionicons
            name={mapType === "standard" ? "earth" : "map"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  scrollContent: { padding: 24 },
  header: { marginBottom: 32 },
  section: { marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  typeCard: {
    flex: 1,
    height: 120,
    borderRadius: 20,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginHorizontal: 4,
  },
  typeCardLost: {
    backgroundColor: "rgba(255, 113, 107, 0.05)",
    borderColor: "rgba(255, 113, 107, 0.3)",
  },
  typeCardFound: {
    backgroundColor: "rgba(63, 255, 139, 0.05)",
    borderColor: "rgba(63, 255, 139, 0.3)",
  },
  typeCardIdle: { backgroundColor: "#131313", borderColor: "#262626" },
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#484847",
    padding: 16,
  },
  openMapText: { color: "#fff", fontSize: 16, flex: 1, marginLeft: 12 },
  uploadArea: {
    minHeight: 120,
    backgroundColor: "#131313",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    borderStyle: "dashed",
  },
  uploadEmpty: { height: 120, justifyContent: "center", alignItems: "center" },
  uploadRow: { padding: 12, alignItems: "center" },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  addTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#383838",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addTileText: { marginTop: 6 },
  imageHint: { marginTop: 8, color: "#adaaaa" },
  submitBtn: { marginTop: 16 },
  modalContainer: { flex: 1, backgroundColor: "#0e0e0e" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mapTypeToggle: {
    position: "absolute",
    bottom: 60,
    right: 20,
    backgroundColor: "rgba(26,26,26,0.9)",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  mapPinLost: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 113, 107, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 113, 107, 0.5)",
  },
  pinInnerLost: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff716b",
  },
  mapPinFound: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(63, 255, 139, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(63, 255, 139, 0.5)",
  },
  pinInnerFound: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3fff8b",
  },
});
