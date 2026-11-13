import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LButton } from '@/components/lister/Button';
import { Studently } from '@/constants/theme';
import { api } from '@/lib/api';
import { creationDraftTitle } from '@/features/listings/useCreationDrafts';
import { CREATION_DRAFTS_KEY, errorMessage, type CreationDraftRecord } from '@/features/listings/create/v2/useCreationWizard';
import { useReducedMotion } from '@/lib/useReducedMotion';

export type DraftModalTarget = CreationDraftRecord;
export function HostDraftModal({ target, onClose, onRemoved }: { target: DraftModalTarget | null; onClose: () => void; onRemoved: () => void }) {
  const router = useRouter(), client = useQueryClient();
  const reduced = useReducedMotion();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const close = () => { setConfirm(false); setError(''); onClose(); };
  async function discard() {
    if (!target || busy) return;
    setBusy(true); setError('');
    try { await api.delete(`/api/listings/creation-drafts/${target.id}`); await client.invalidateQueries({ queryKey: CREATION_DRAFTS_KEY }); onRemoved(); close(); }
    catch(e) { setError(errorMessage(e, 'Couldn’t remove your draft. Try again.')); }
    finally { setBusy(false); }
  }
  return <Modal visible={Boolean(target)} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={close}><View style={styles.overlay}><View style={styles.card} role="dialog" accessibilityViewIsModal accessibilityLabel="In progress draft">
    <Text style={styles.title}>{target ? creationDraftTitle(target) : ''}</Text><Text style={styles.body}>{confirm ? 'Discard this unpublished draft and all its units?' : 'Your place and units are saved to your account.'}</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {confirm ? <LButton label="Discard draft" variant="danger" loading={busy} onPress={() => void discard()} /> : <><LButton label="Continue" onPress={() => { if (!target) return; const id = target.id; close(); router.push({ pathname: '/(poster)/create', params: { draftId: id } }); }} /><LButton label="Discard draft" variant="secondary" onPress={() => setConfirm(true)} /></>}
    <Pressable accessibilityRole="button" onPress={close} style={styles.close}><Text style={styles.body}>Cancel</Text></Pressable>
  </View></View></Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(26,26,26,.4)' }, card: { width: '100%', maxWidth: 440, padding: 24, borderRadius: 12, backgroundColor: '#fff', gap: 20 }, title: { fontFamily: Studently.type.bodySemi, fontSize: 20, color: '#1A1A1A' }, body: { fontFamily: Studently.type.body, fontSize: 14, lineHeight: 21, color: '#625E59' }, error: { color: '#B42318' }, close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
