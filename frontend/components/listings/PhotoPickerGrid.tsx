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
  pickAndUploadPhotos,
  photoPickerStyles,
  uploadDraft,
  type DraftPhoto,
  type PhotoPickerGridProps,
} from "./PhotoPickerGrid.shared";

export type { DraftPhoto } from "./PhotoPickerGrid.shared";
export { MAX_LISTING_PHOTOS, MIN_LISTING_PHOTOS } from "./PhotoPickerGrid.shared";

export function PhotoPickerGrid({ photos, setPhotos, style }: PhotoPickerGridProps) {
  const remaining = MAX_LISTING_PHOTOS - photos.length;
  const readyCount = photos.filter((p) => p.status === "ready").length;
  const uploading = photos.some((p) => p.status === "uploading");

  function removePhoto(localId: string) {
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

      <DraggableFlatList
        data={photos}
        keyExtractor={(item) => item.localId}
        numColumns={2}
        scrollEnabled={false}
        onDragEnd={({ data }) => setPhotos(data)}
        renderItem={renderItem}
        columnWrapperStyle={photoPickerStyles.columnWrap}
        contentContainerStyle={photoPickerStyles.nativeGrid}
        ListFooterComponent={
          remaining > 0 ? (
            <AddPhotoTile
              remaining={remaining}
              index={photos.length}
              onPress={() => void pickAndUploadPhotos(remaining, setPhotos)}
            />
          ) : null
        }
      />

      <PhotoGridFooter readyCount={readyCount} />
    </View>
  );
}
