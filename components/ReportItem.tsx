import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Card } from "./ui/Card";
import { StatusBadge } from "./ui/StatusBadge";
import { Typography } from "./ui/Typography";

interface ReportItemProps {
  item: {
    id: string;
    item_name: string;
    type: "lost" | "found";
    location_name?: string;
    description?: string;
    image_url?: string;
    created_at: string;
  };
  onPress: () => void;
  variant?: "list" | "large";
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export const ReportItem: React.FC<ReportItemProps> = ({
  item,
  onPress,
  variant = "large",
}) => {
  const isLarge = variant === "large";

  return (
    <Card style={isLarge ? styles.largeCard : styles.card} onPress={onPress}>
      {isLarge && (
        <LinearGradient
          colors={[
            item.type === "lost"
              ? "rgba(255, 113, 107, 0.15)"
              : "rgba(63, 255, 139, 0.15)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardGradient}
        />
      )}

      <View style={styles.cardTop}>
        <StatusBadge type={item.type} />
        <Typography variant="small" color="#adaaaa">
          {timeAgo(item.created_at)}
        </Typography>
      </View>

      <Typography
        variant={isLarge ? "h3" : "body"}
        weight="bold"
        style={styles.mainTitle}
      >
        {item.item_name}
      </Typography>

      <View style={styles.detailRow}>
        <Ionicons name="location" size={16} color="#adaaaa" />
        <Typography variant="small" style={styles.detailText}>
          {item.location_name || "Location unknown"}
        </Typography>
      </View>

      {isLarge && item.description && (
        <View style={styles.descriptionContainer}>
          <Typography variant="body" style={styles.descriptionText}>
            {item.description}
          </Typography>
        </View>
      )}

      {isLarge && item.image_url && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image_url }} style={styles.image} />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
  },
  largeCard: {
    marginBottom: 24,
    padding: 20,
    overflow: "hidden",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mainTitle: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailText: {
    marginLeft: 6,
  },
  descriptionContainer: {
    backgroundColor: "#131313",
    padding: 16,
    borderRadius: 12,
  },
  descriptionText: {
    lineHeight: 20,
  },
  imageContainer: {
    marginTop: 16,
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
