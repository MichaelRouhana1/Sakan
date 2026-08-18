import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CreateWizardShellWithArt } from "@/components/listings/create/CreateWizardShell.shared";
import { Lister } from "@/constants/listerTheme";

export function CreateWizardShell() {
  const insets = useSafeAreaInsets();

  return (
    <CreateWizardShellWithArt
      splitAt={768}
      styles={styles}
      rootStyle={{ paddingTop: insets.top }}
      footerInsetBottom={insets.bottom}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Lister.color.surface },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Lister.space.lg,
    paddingBottom: 12,
    zIndex: 2,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  stage: { flex: 1, flexDirection: "row", minHeight: 0, overflow: "hidden" },
  left: {
    width: "42%",
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  right: { flex: 1 },
  rightInner: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 48 },
  stack: { paddingBottom: 32 },
  artBand: {
    height: 200,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  phoneForm: {
    paddingHorizontal: Lister.space.lg,
    paddingTop: 16,
  },
});
