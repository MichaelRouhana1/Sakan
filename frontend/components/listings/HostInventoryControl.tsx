import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Studently } from '@/constants/theme';
import { fetchInventory, inventoryError, inventoryKey, inventoryMessage, saveInventory, setPlaceVisibility, type InventoryChange, type UnitInventory } from '@/features/listings/hostInventory';
import type { GenderRestriction } from '@/types/listing';

const genderLabels: Record<GenderRestriction, string> = { anyone: 'Anyone', girls_only: 'Female only', boys_only: 'Male only' };
type Dialog = 'manage' | 'beds' | 'moved_in' | 'gender' | 'rented' | 'show_place' | 'hide_place' | null;

function Button({label, onPress, disabled = false}: {label: string; onPress: () => void; disabled?: boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}}
    onPress={event => {event.stopPropagation(); onPress();}} style={[styles.button, disabled && styles.disabled]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

/** Owner-only inventory, shared by the web and native host dashboards. */
export function HostInventoryControl({listingId}: {listingId: string}) {
  const client = useQueryClient();
  const query = useQuery({queryKey: inventoryKey(listingId), queryFn: () => fetchInventory(listingId)});
  const row = query.data;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [blocker, setBlocker] = useState<{id: string; title: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [total, setTotal] = useState('');
  const [available, setAvailable] = useState('');
  const [bedSource, setBedSource] = useState<UnitInventory | null>(null);
  const [gender, setGender] = useState<GenderRestriction>('anyone');
  const [genderSource, setGenderSource] = useState<UnitInventory | null>(null);
  const [undo, setUndo] = useState<{row: UnitInventory; gender: GenderRestriction} | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function refreshRelated() {
    void client.invalidateQueries({queryKey: ['host-inventory']});
    void client.invalidateQueries({queryKey: ['listings']});
    void client.invalidateQueries({queryKey: ['promotions']});
  }
  async function save(change: InventoryChange, source = row) {
    if (!source || saving.current) return null;
    saving.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      const result = await saveInventory(source, change);
      client.setQueryData(inventoryKey(listingId), result);
      refreshRelated();
      return result;
    } catch (e) {
      setError(inventoryError(e));
      return null;
    } finally {saving.current = false; setBusy(false);}
  }
  function close() {if (!saving.current) {setDialog(null); setGenderSource(null);}}
  function confirmBeds() {
    if (!row) return;
    setTotal(String(row.bedsTotal ?? '')); setAvailable(String(row.bedsAvailable ?? ''));
    setBedSource(row);
    setError(null); setDialog('beds');
  }
  async function bedAction(action: 'rent_one' | 'free_one') {
    const result = await save({bedAction: action});
    if (result && action === 'rent_one') {setGenderSource(result); setDialog('moved_in');}
  }
  async function confirmGender() {
    const source = genderSource ?? row;
    const result = await save({genderRestriction: gender}, source);
    if (result && source) {
      setUndo({row: result, gender: source.genderRestriction});
      setNotice('Gender preference saved.'); close();
    }
  }
  async function undoGender() {
    if (!undo) return;
    if (await save({genderRestriction: undo.gender}, undo.row)) {setUndo(null); setNotice('Previous gender preference restored.');}
  }
  async function changePlaceVisibility(hidden: boolean) {
    if (!row || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try {await setPlaceVisibility(row.placeId, hidden); refreshRelated(); setDialog(null);}
    catch(e) {setError(inventoryError(e));}
    finally {saving.current = false; setBusy(false);}
  }
  const errorView = error ? <View style={styles.stack}>
    <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
    <Button label="Refresh inventory" onPress={() => {close(); setError(null); void query.refetch();}} disabled={busy}/>
  </View> : null;
  if (!row) return <View style={styles.box}>{query.isError
    ? <><Text style={styles.error}>Could not load inventory.</Text><Button label="Retry inventory" onPress={() => void query.refetch()}/></>
    : <ActivityIndicator accessibilityLabel="Loading inventory"/>}</View>;
  const shared = row.unitType === 'shared_bed';
  const reason = inventoryMessage(row);
  const blocked = row.blockers.length > 0;
  const countValid = /^\d+$/.test(total) && /^\d+$/.test(available) && Number(total) > 0 && Number(total) <= 10000 && Number(available) <= Number(total);

  // List rows are pressable too. Inventory interactions must not open the editor.
  return <Pressable style={styles.box} accessible={false} focusable={false} onPress={event => event.stopPropagation()}>
    {reason ? <Text style={styles.reason}>{reason}</Text> : <Text style={styles.body}>{row.availability === 'pending' ? 'Under offer' : 'Available'}</Text>}
    {row.status !== 'active' ? <Text style={styles.body}>This listing is {row.status}. Freeing it updates occupancy; it does not publish or renew it.</Text> : null}
    {shared && !row.inventoryNeedsConfirmation ? <Text style={styles.body}>{row.bedsAvailable} of {row.bedsTotal} beds available</Text> : null}
    <View style={styles.actions}>
      {shared ? row.inventoryNeedsConfirmation
        ? <Button label="Confirm available beds" onPress={confirmBeds} disabled={busy}/>
        : <><Button label="Mark 1 bed rented" disabled={busy || blocked || !row.bedsAvailable} onPress={() => void bedAction('rent_one')}/>
          <Button label="Free a bed" disabled={busy || row.bedsAvailable === row.bedsTotal} onPress={() => void bedAction('free_one')}/></>
        : <Button label={row.availability === 'rented' ? 'Mark vacant' : 'Mark rented'} disabled={busy || (blocked && row.availability !== 'rented')}
          onPress={() => row.availability === 'rented' ? void save({availability: 'available'}) : setDialog('rented')}/>}
      <Button label="Manage availability" onPress={() => {setError(null); setDialog('manage');}} disabled={busy}/>
    </View>
    {row.blockers.map(b => <Button key={b.id} label={`Manage ${b.title}`} onPress={() => setBlocker(b)} disabled={busy}/>)}
    {dialog === null ? errorView : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text> : null}
    {undo ? <Button label="Undo gender change" disabled={busy} onPress={() => void undoGender()}/> : null}
    <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.scrim} role="dialog" accessibilityLabel="Unit inventory" accessibilityViewIsModal><ScrollView style={styles.dialog} contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{dialog === 'moved_in' ? 'Who moved in?' : dialog === 'beds' ? 'Confirm available beds' : dialog === 'gender' ? 'Gender preference' : dialog === 'rented' ? 'Mark this unit rented?' : dialog === 'show_place' ? 'Show this place again?' : dialog === 'hide_place' ? 'Hide this place?' : 'Manage availability'}</Text>
        {dialog === 'moved_in' ? <>
          <Text style={styles.body}>{(genderSource?.bedsAvailable ?? 0) > 0 ? 'The bed is marked rented. Your gender preference stays the same until you confirm.' : 'All beds are now rented. No gender preference needs to change.'}</Text>
          <View style={styles.actions}>{(['Female','Male'] as const).map(label => <Button key={label} label={label} disabled={busy} onPress={() => {
            if (!genderSource?.bedsAvailable) {close(); return;}
            setGender(label === 'Female' ? 'girls_only' : 'boys_only'); setDialog('gender');
          }}/>)}</View><Button label="Skip" onPress={close} disabled={busy}/>
        </> : null}
        {dialog === 'gender' ? <>
          <Text style={styles.body}>{genderSource ? 'Offer the remaining beds to this gender only?' : 'Choose who this shared room is offered to. You can change it anytime.'}</Text>
          <View style={styles.actions}>{(Object.keys(genderLabels) as GenderRestriction[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={genderLabels[value]} accessibilityState={{checked: gender === value, disabled: busy}} disabled={busy} onPress={() => setGender(value)} style={[styles.button, gender === value && styles.selected]}><Text style={styles.buttonText}>{genderLabels[value]}</Text></Pressable>)}</View>
          <Button label="Confirm gender preference" onPress={() => void confirmGender()} disabled={busy}/>
        </> : null}
        {dialog === 'beds' ? <>
          <Text style={styles.body}>Enter the actual vacancy. Existing occupants count as rented beds.</Text>
          <Text style={styles.body}>Total beds</Text><TextInput accessibilityLabel="Total beds" value={total} onChangeText={setTotal} keyboardType="number-pad" editable={!busy} style={styles.input}/>
          <Text style={styles.body}>Available beds</Text><TextInput accessibilityLabel="Available beds" value={available} onChangeText={setAvailable} keyboardType="number-pad" editable={!busy} style={styles.input}/>
          {!countValid ? <Text style={styles.body}>Use whole numbers, with available beds between zero and the total.</Text> : null}
          <Button label="Save bed counts" disabled={busy || !countValid} onPress={async() => {if (bedSource && await save({bedsTotal: Number(total), bedsAvailable: Number(available)}, bedSource)) close();}}/>
        </> : null}
        {dialog === 'rented' ? <><Text style={styles.body}>This unit will leave search. Related whole-apartment or room offers will be hidden when they cannot be rented together. Unused promotion time is refunded.</Text><Button label="Confirm rented" disabled={busy} onPress={async() => {if (await save({availability: 'rented'})) close();}}/></> : null}
        {dialog === 'show_place' ? <><Text style={styles.body}>This removes the place's manual hiding for all its units. Rented units and units blocked by other occupants stay hidden.</Text><Button label="Confirm show place" disabled={busy} onPress={() => void changePlaceVisibility(false)}/></> : null}
        {dialog === 'hide_place' ? <><Text style={styles.body}>All your units in this place will leave search. Bed counts and occupancy stay the same. Unused promotion time is refunded.</Text><Button label="Confirm hide place" disabled={busy} onPress={() => void changePlaceVisibility(true)}/></> : null}
        {dialog === 'manage' ? <>
          <Text style={styles.body}>{reason ?? 'Inventory is available.'} Hiding keeps your bed counts, listing dates and occupancy.</Text>
          <Button label={row.hidden ? 'Show this unit' : 'Hide this unit'} disabled={busy} onPress={async() => {if (await save({hidden: !row.hidden})) close();}}/>
          <Button label={row.placeHidden ? 'Show this place' : 'Hide this place'} disabled={busy} onPress={() => setDialog(row.placeHidden ? 'show_place' : 'hide_place')}/>
          {row.availability !== 'rented' && !row.inventoryNeedsConfirmation ? <Button label={row.availability === 'pending' ? 'Mark available' : 'Mark under offer'} disabled={busy} onPress={async() => {if (await save({availability: row.availability === 'pending' ? 'available' : 'pending'})) close();}}/> : null}
          {shared ? <><Button label="Edit bed counts" onPress={confirmBeds} disabled={busy}/><Text style={styles.body}>Gender preference: {genderLabels[row.genderRestriction]}</Text><Button label="Change gender preference" disabled={busy} onPress={() => {setGender(row.genderRestriction); setGenderSource(row); setDialog('gender');}}/></> : null}
        </> : null}
        {dialog !== null ? errorView : null}<Button label={dialog === 'moved_in' ? 'Done' : 'Close'} onPress={close} disabled={busy}/>
      </ScrollView></View>
    </Modal>
    <Modal visible={blocker !== null} transparent animationType="fade" onRequestClose={() => setBlocker(null)}>
      <View style={styles.scrim} role="dialog" accessibilityLabel="Blocking unit" accessibilityViewIsModal><ScrollView style={styles.dialog} contentContainerStyle={styles.dialogContent}>
        <Text style={styles.title}>{blocker?.title}</Text>
        {blocker ? <HostInventoryControl key={blocker.id} listingId={blocker.id}/> : null}
        <Button label="Back to this unit" onPress={() => setBlocker(null)}/>
      </ScrollView></View>
    </Modal>
  </Pressable>;
}

const styles = StyleSheet.create({
  box: {gap: 8, paddingVertical: 10, alignSelf: 'stretch'},
  stack: {gap: 8}, actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  body: {fontFamily: Studently.type.body, fontSize: 13, lineHeight: 19, color: Studently.color.inkMuted},
  reason: {fontFamily: Studently.type.bodySemi, fontSize: 13, lineHeight: 19, color: '#92400E'},
  error: {color: Studently.color.danger, fontSize: 13, lineHeight: 19},
  button: {borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center', backgroundColor: '#FFFFFF'},
  buttonText: {fontFamily: Studently.type.bodySemi, fontSize: 13, color: Studently.color.ink},
  selected: {borderColor: Studently.color.primary, backgroundColor: Studently.color.primarySoft},
  disabled: {opacity: 0.45},
  scrim: {flex: 1, padding: 20, backgroundColor: 'rgba(18,24,38,0.45)', alignItems: 'center', justifyContent: 'center'},
  dialog: {width: '100%', maxWidth: 460, maxHeight: '90%', flexGrow: 0, backgroundColor: '#FFFFFF', borderRadius: 14},
  dialogContent: {padding: 20, gap: 14},
  title: {fontFamily: Studently.type.bodyBold, fontSize: 20, color: Studently.color.ink},
  input: {borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16, color: Studently.color.ink},
});
