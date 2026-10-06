import { removePhotoUri } from "@/features/listings/photoUriOwnership";
import { LText } from "@/components/lister/Typography";
import { usePhotoCropQueue } from "@/features/listings/usePhotoCropQueue";
import { PhotoCropModal } from "./photos/PhotoCropModal";
import { PhotoGuidance } from "./photos/PhotoGuidance";
import { View } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import {
  AddPhotoTile,
  MAX_LISTING_PHOTOS,
  PhotoGridFooter,
  PhotoGridHeader,
  PhotoTile,
  photoPickerStyles,
  uploadDraft,
  type DraftPhoto,
  type PhotoPickerGridProps,
} from "./PhotoPickerGrid.shared";

export type { DraftPhoto } from "./PhotoPickerGrid.shared";
export {
  MAX_LISTING_PHOTOS,
  MIN_LISTING_PHOTOS,
} from "./PhotoPickerGrid.shared";

export function PhotoPickerGrid({
  photos,
  setPhotos,
  style,
}: PhotoPickerGridProps) {
  const cropController = usePhotoCropQueue({ photos, setPhotos });
  const remaining = MAX_LISTING_PHOTOS - photos.length;
  const readyCount = photos.filter((p) => p.status === "ready").length;
  const uploading = photos.some((p) => p.status === "uploading");

  function removePhoto(localId: string) {
    const photo = photos.find((p) => p.localId === localId);
    if (photo) removePhotoUri(photo.uri);
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  }

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<DraftPhoto>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={0.98}>
        <PhotoTile
          onCaption={(caption) =>
            setPhotos((prev) =>
              prev.map((p) =>
                p.localId === item.localId ? { ...p, caption } : p,
              ),
            )
          }
          photo={item}
          index={index}
          isDragging={isActive}
          onRemove={() => removePhoto(item.localId)}
          onRetry={() => void uploadDraft(item.localId, item.uri, setPhotos)}
          onDrag={drag}
          style={photoPickerStyles.nativeCell}
        />
      </ScaleDecorator>
    );
  };

  return (
    <View style={[photoPickerStyles.root, style]}>
      <PhotoGridHeader photoCount={photos.length} uploading={uploading} />
      <PhotoGuidance />
      {!cropController.locked &&
        cropController.state.notices.map((notice, i) => (
          <LText key={i} accessibilityLiveRegion="polite" variant="caption">
            {notice}
          </LText>
        ))}
      <PhotoCropModal controller={cropController} photoCount={photos.length} />

      <DraggableFlatList
        data={photos}
        keyExtractor={(item) => item.localId}
        numColumns={2}
        scrollEnabled={false}
        onDragEnd={({ data }) =>
          setPhotos((prev) => {
            const byId = new Map(prev.map((p) => [p.localId, p]));
            const ordered = data.flatMap((p) =>
              byId.has(p.localId) ? [byId.get(p.localId)!] : [],
            );
            return [
              ...ordered,
              ...prev.filter((p) => !data.some((d) => d.localId === p.localId)),
            ];
          })
        }
        renderItem={renderItem}
        columnWrapperStyle={photoPickerStyles.columnWrap}
        contentContainerStyle={photoPickerStyles.nativeGrid}
        ListFooterComponent={
          remaining > 0 ? (
            <AddPhotoTile
              remaining={remaining}
              index={photos.length}
              disabled={cropController.locked}
              onPress={() => void cropController.pick()}
            />
          ) : null
        }
      />

      <PhotoGridFooter readyCount={readyCount} />
    </View>
  );
}
