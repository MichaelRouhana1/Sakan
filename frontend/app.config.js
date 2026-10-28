/**
 * Expo app config. Reads Google Maps API key from env for Android builds.
 * Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in local .env and as an EAS env/secret
 * for cloud Android builds (local .env alone → blank map on EAS).
 */
export default {
  expo: {
    name: "Studently",
    slug: "studently",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "studently",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.studently.app",
      infoPlist: {
        // Dev: listing photos are served over LAN http:// (Expo Go uses its own
        // ATS; this applies to custom/dev builds).
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    android: {
      package: "com.studently.app",
      // Listing photos are served over LAN http:// during local/dev.
      usesCleartextTraffic: true,
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
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
      // Production export stays static HTML. Local `expo start` uses a SPA so
      // Metro does not server-render every route (that was the black screen
      // with the lightning bolt when a page or HMR reload failed in Node).
      output:
        process.env.EXPO_WEB_OUTPUT ??
        (process.argv.includes("export") || process.env.EAS_BUILD === "true"
          ? "static"
          : "single"),
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-image",
      "expo-secure-store",
      "expo-status-bar",
      "expo-web-browser",
      "expo-notifications",
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Studently needs photo access so landlords can show listing rooms and exteriors.",
          cameraPermission:
            "Studently needs camera access to photograph listing spaces.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Studently uses your location only to place the listing pin near you.",
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
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
    },
  },
};
