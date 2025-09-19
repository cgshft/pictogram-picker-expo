import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      // Configure the header for all screens in this stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#1E1E1E",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        contentStyle: {
          backgroundColor: "#121212", // Set a default dark background for screen content
        },
      }}
    >
      {/* Define specific options for each screen */}
      <Stack.Screen name="index" options={{ title: "Symbol Deck Home" }} />
      <Stack.Screen name="picker" options={{ title: "Symbol Picker" }} />
    </Stack>
  );
}