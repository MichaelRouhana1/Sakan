import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { ListingCard } from "@/components/listings/ListingCard";
import {
  SearchModeToggle,
  type SearchMode,
} from "@/components/listings/SearchModeToggle";
import { Text } from "@/components/ui/Text";
import { useListings } from "@/features/listings/useListings";

export default function RenterHomeScreen() {
  const [mode, setMode] = useState<SearchMode>("standard");
  const { data, isLoading, isError } = useListings({});

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Skoun</Text>
      <SearchModeToggle mode={mode} onChange={setMode} />
      <Text style={styles.modeHint}>
        {mode === "standard"
          ? "Browse by Lebanese city / district"
          : "Sort by distance to campus gate"}
      </Text>
      {isLoading ? <ActivityIndicator /> : null}
      {isError ? (
        <Text style={styles.hint}>Unable to load listings (is the API running?)</Text>
      ) : null}
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() =>
              router.push({
                pathname: "/(renter)/listing/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.hint}>No listings yet</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  modeHint: {
    color: "#666",
    marginBottom: 12,
  },
  hint: {
    color: "#888",
    marginTop: 24,
    textAlign: "center",
  },
});
