import { StyleSheet } from "react-native";
import { CreateWizardShellWithArt } from "@/components/listings/create/CreateWizardShell.shared";
import { Lister } from "@/constants/listerTheme";

export function CreateWizardShell() {
  return (
    <CreateWizardShellWithArt
      splitAt={1024}
      styles={styles}
      rootStyle={{ height: "100vh" as unknown as number }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Lister.color.surface,
  },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 12,
    zIndex: 2,
    backgroundColor: Lister.color.surface,
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
    cursor: "pointer",
  },
  saveExit: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  saveExitText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 15,
    color: Lister.color.ink,
    textDecorationLine: "underline",
  },
  stage: { flex: 1, flexDirection: "row", minHeight: 0, overflow: "hidden" },
  left: {
    width: "46%",
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  right: { flex: 1, backgroundColor: Lister.color.surface },
  rightInner: {
    paddingHorizontal: 48,
    paddingTop: 48,
    paddingBottom: 64,
    maxWidth: 640,
  },
  stack: { paddingBottom: 48 },
  artBand: {
    height: 240,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  phoneForm: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
