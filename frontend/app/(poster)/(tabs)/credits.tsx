import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SwitchRoleControl } from "@/components/auth/SwitchRoleControl";
import {
  CollapsingHeaderBar,
  useCollapsingHeader,
} from "@/components/ui/CollapsingHeader";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { HideIosTabScrollFade } from "@/components/ui/HideIosTabScrollFade";
import { HostCreditsPage } from "@/components/web/host/HostCreditsPage";
import { Studently } from "@/constants/theme";

export default function CreditsScreen() {
  const header = useCollapsingHeader({ defaultThreshold: 140 });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.stage}>
          <HideIosTabScrollFade style={styles.safe}>
            <Animated.ScrollView
              onScroll={header.onScroll}
              scrollEventThrottle={header.scrollEventThrottle}
              contentContainerStyle={styles.content}
            >
              <HostCreditsPage
                onTitleLayout={header.onLargeTitleLayout}
                titleAnimatedStyle={header.largeTitleStyle}
              />
              <View style={styles.switchWrap}>
                <SwitchRoleControl currentRole="poster" />
              </View>
            </Animated.ScrollView>
          </HideIosTabScrollFade>
          <CollapsingHeaderBar
            controller={header}
            title="Credits"
            variant="overlay"
            backgroundColor={Studently.color.bg}
            borderColor={Studently.color.border}
            titleColor={Studently.color.ink}
            testID="credits-collapsing-header"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Studently.color.bg,
  },
  safe: {
    flex: 1,
  },
  stage: {
    flex: 1,
    position: "relative",
  },
  content: {
    paddingBottom: appleTabScrollInset,
  },
  switchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "flex-start",
  },
});
