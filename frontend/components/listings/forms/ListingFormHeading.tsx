import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { LText } from '@/components/lister/Typography';
import { Studently } from '@/constants/theme';

export function ListingFormHeading({ title, subtitle, titleStyle }: { title: string; subtitle: string; titleStyle?: StyleProp<TextStyle> }) {
  return <><LText style={[styles.title, titleStyle]}>{title}</LText><LText tone="muted" style={styles.subtitle}>{subtitle}</LText></>;
}
const styles = StyleSheet.create({ title: { fontFamily: Studently.type.bodyBold, fontSize: 28, lineHeight: 34, letterSpacing: -.7 }, subtitle: { marginTop: 12, maxWidth: 460, fontSize: 15, lineHeight: 23 } });
