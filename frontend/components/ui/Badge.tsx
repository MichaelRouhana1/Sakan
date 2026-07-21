import { StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";
import { Text } from "./Text";

type BadgeProps = {
  label: string;
};

export function Badge({ label }: BadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Lister.color.primaryMist,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: Lister.color.primaryDeep,
  },
});
