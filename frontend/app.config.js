/**
 * Expo app config. Reads Google Maps API key from env for Android builds.
 * Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in local .env and as an EAS env/secret
 * for cloud Android builds (local .env alone → blank map on EAS).
 */
export default {
  expo: {
    name: "Skoun",
    slug: "skoun",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "skoun",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.skoun.app",
    },
    android: {
      package: "com.skoun.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
        },
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Skoun needs photo access so landlords can show listing rooms and exteriors.",
          cameraPermission:
            "Skoun needs camera access to photograph listing spaces.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Skoun uses your location only to place the listing pin near you.",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
